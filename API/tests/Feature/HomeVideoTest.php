<?php

namespace Tests\Feature;

use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class HomeVideoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    private function userWithRole(string $role, array $attributes = []): User
    {
        Role::findOrCreate($role, 'web');
        $user = User::factory()->create(array_merge([
            'email_verified_at' => now(), 'is_active' => true, 'activity_blocked' => false,
        ], $attributes));
        $user->assignRole($role);

        return $user;
    }

    public function test_visitors_can_read_default_but_cannot_change_video(): void
    {
        $this->getJson('/api/inicio/video')->assertOk()->assertJsonPath('url', null);
        $this->getJson('/api/inicio/video/archivo')->assertNotFound();
        $this->postJson('/api/inicio/video')->assertUnauthorized();
        $this->actingAs($this->userWithRole('usuario'))->postJson('/api/inicio/video')->assertForbidden();
        $this->actingAs($this->userWithRole('editor'))->postJson('/api/inicio/video')->assertForbidden();
        $this->assertDatabaseCount('site_settings', 0);
    }

    public function test_admin_library_preserves_uploads_and_selects_fixed_or_random(): void
    {
        $this->actingAs($this->userWithRole('admin'));
        foreach (['mp4', 'webm'] as $extension) {
            $this->postJson('/api/inicio/video', ['video' => UploadedFile::fake()->create('welcome.'.$extension, 100, 'video/'.$extension)])
                ->assertOk()->assertJsonStructure(['mode', 'selected', 'videos']);
        }
        $videos = SiteSetting::first()->value['videos'];
        $this->assertCount(2, $videos);
        foreach ($videos as $video) {
            Storage::disk('local')->assertExists($video['path']);
        }
        $this->putJson('/api/inicio/videos', ['mode' => 'fixed', 'selected' => $videos[1]['id']])->assertOk();
        $this->getJson('/api/inicio/video')->assertJsonPath('url', route('home-video.file').'?v='.$videos[1]['id']);
        $this->putJson('/api/inicio/videos', ['mode' => 'random'])->assertOk();
        $urls = array_map(fn ($v) => route('home-video.file').'?v='.$v['id'], $videos);
        for ($i = 0; $i < 8; $i++) {
            $this->assertContains($this->getJson('/api/inicio/video')->json('url'), $urls);
        }
        $this->putJson('/api/inicio/videos', ['mode' => 'fixed', 'selected' => 'unknown'])->assertUnprocessable();
        $this->putJson('/api/inicio/videos', ['mode' => 'fixed', 'selected' => null])->assertOk();
        $this->getJson('/api/inicio/video')->assertJsonPath('url', null);
    }

    public function test_invalid_and_oversized_uploads_preserve_existing_video(): void
    {
        Storage::disk('local')->put('home-videos/original.mp4', 'existing');
        SiteSetting::create(['key' => 'home_video', 'value' => ['path' => 'home-videos/original.mp4']]);
        $this->actingAs($this->userWithRole('admin'));
        foreach ([
            UploadedFile::fake()->createWithContent('fake.mp4', '<?php echo "not a video";'),
            UploadedFile::fake()->create('large.mp4', 51201, 'video/mp4'),
        ] as $file) {
            $this->postJson('/api/inicio/video', ['video' => $file])
                ->assertUnprocessable()->assertJsonValidationErrors('video');
        }
        $this->assertSame('home-videos/original.mp4', SiteSetting::first()->value['path']);
        Storage::disk('local')->assertExists('home-videos/original.mp4');
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_blocked_and_unverified_admins_cannot_upload(): void
    {
        foreach ([['activity_blocked' => true], ['email_verified_at' => null], ['is_active' => false]] as $attributes) {
            $this->actingAs($this->userWithRole('admin', $attributes))
                ->postJson('/api/inicio/video', [
                    'video' => UploadedFile::fake()->create('welcome.mp4', 100, 'video/mp4'),
                ])->assertForbidden();
        }
        $this->assertDatabaseCount('site_settings', 0);
    }

    public function test_video_supports_public_byte_range_requests(): void
    {
        Storage::disk('local')->put('home-videos/sample.mp4', str_repeat('a', 100));
        SiteSetting::create(['key' => 'home_video', 'value' => ['path' => 'home-videos/sample.mp4']]);
        $this->withHeader('Range', 'bytes=0-9')->get('/api/inicio/video/archivo')
            ->assertStatus(206)->assertHeader('Content-Range', 'bytes 0-9/100')
            ->assertHeader('Content-Length', '10');
    }
}
