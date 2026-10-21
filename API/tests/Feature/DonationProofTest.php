<?php

namespace Tests\Feature;

use App\Models\Donation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DonationProofTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    private function payload(): array
    {
        return ['nombre_donante' => 'Donante de prueba', 'email_donante' => 'donante@example.test', 'monto' => '15.50', 'categoria' => 'ofrenda'];
    }

    private function userWithRole(string $role): User
    {
        Role::findOrCreate($role, 'web');
        $user = User::factory()->create(['email_verified_at' => now(), 'is_active' => true, 'activity_blocked' => false]);
        $user->assignRole($role);

        return $user;
    }

    public function test_public_donation_stores_photo_privately_without_exposing_its_path(): void
    {
        $response = $this->post('/api/finanzas/donaciones/public', [
            ...$this->payload(), 'comprobante' => UploadedFile::fake()->image('deposito.jpg'),
        ], ['Accept' => 'application/json']);
        $response->assertCreated()->assertJsonPath('receipt.tiene_comprobante', true)->assertJsonMissingPath('receipt.comprobante_path');
        $donation = Donation::firstOrFail();
        Storage::disk('local')->assertExists($donation->comprobante_path);
        $this->getJson('/api/finanzas/donaciones/'.$donation->id.'/foto-comprobante')->assertUnauthorized();
        $this->getJson('/storage/'.$donation->comprobante_path)->assertForbidden();
    }

    public function test_photo_is_required_even_for_direct_json_requests(): void
    {
        $this->postJson('/api/finanzas/donaciones/public', $this->payload())
            ->assertUnprocessable()->assertJsonValidationErrors('comprobante');
        $this->assertDatabaseCount('donations', 0);
    }

    public function test_only_authorized_staff_can_read_photo_even_if_public_receipt_token_is_known(): void
    {
        $this->postJson('/api/finanzas/donaciones/public', [
            ...$this->payload(), 'comprobante' => UploadedFile::fake()->image('deposito.png'),
        ])->assertCreated();
        $donation = Donation::firstOrFail();
        $url = '/api/finanzas/donaciones/'.$donation->id.'/foto-comprobante';
        $this->actingAs($this->userWithRole('usuario'))
            ->getJson($url.'?token='.$donation->public_receipt_token)->assertForbidden();
        foreach (['editor', 'admin'] as $role) {
            $this->actingAs($this->userWithRole($role))->get($url)
                ->assertOk()->assertHeader('Content-Type', 'image/png');
            $this->getJson('/api/finanzas/donaciones')->assertOk()
                ->assertJsonPath('0.tiene_comprobante', true)->assertJsonMissingPath('0.comprobante_path');
        }
    }

    public function test_invalid_and_large_photos_are_rejected_without_creating_donations(): void
    {
        $sourceImage = UploadedFile::fake()->image('source.jpg');
        foreach ([
            UploadedFile::fake()->createWithContent('fake.jpg', '<?php echo "not an image";'),
            UploadedFile::fake()->createWithContent('large.jpg', file_get_contents($sourceImage->getPathname()).str_repeat("\0", 5121 * 1024)),
            UploadedFile::fake()->createWithContent('vector.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
        ] as $file) {
            $upload = new UploadedFile($file->getPathname(), $file->getClientOriginalName(), null, null, true);
            $this->postJson('/api/finanzas/donaciones/public', [...$this->payload(), 'comprobante' => $upload])
                ->assertUnprocessable()->assertJsonValidationErrors('comprobante');
        }
        $this->assertDatabaseCount('donations', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_ticket_preserves_donation_and_private_attachment_for_review(): void
    {
        $this->postJson('/api/finanzas/donaciones/public', [
            ...$this->payload(), 'comprobante' => UploadedFile::fake()->image('deposito.jpg'),
        ])->assertCreated();
        $donation = Donation::firstOrFail();
        $this->actingAs($this->userWithRole('admin'))->deleteJson('/api/finanzas/donaciones/'.$donation->id)->assertOk();
        Storage::disk('local')->assertExists($donation->comprobante_path);
        $this->assertSoftDeleted($donation);
        $this->assertDatabaseCount('donations', 1);
    }
}
