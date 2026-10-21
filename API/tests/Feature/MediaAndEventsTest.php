<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MediaAndEventsTest extends TestCase
{
    use RefreshDatabase;

    private function person($role)
    {
        Role::findOrCreate($role, 'web');
        $u = User::factory()->create(['email_verified_at' => now(), 'is_active' => true, 'activity_blocked' => false]);
        $u->assignRole($role);

        return $u;
    }

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    public function test_upload_permissions_and_validation(): void
    {
        $this->postJson('/api/media')->assertUnauthorized();
        $this->actingAs($this->person('usuario'))->postJson('/api/media')->assertForbidden();
        $editor = $this->person('editor');
        $this->actingAs($editor);
        $r = $this->postJson('/api/media', ['kind' => 'image', 'file' => UploadedFile::fake()->image('photo.png')])->assertCreated();
        $this->get($r->json('url'))->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->postJson('/api/media', ['kind' => 'image', 'file' => UploadedFile::fake()->createWithContent('fake.png', '<?php echo 1;')->mimeType('text/x-php')])->assertUnprocessable();
        $this->postJson('/api/media', ['kind' => 'image', 'file' => UploadedFile::fake()->createWithContent('fake.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>')])->assertUnprocessable();
        $this->postJson('/api/media', ['kind' => 'video', 'file' => UploadedFile::fake()->create('large.mp4', 51201, 'video/mp4')])->assertUnprocessable();
        $editor->forceFill(['email_verified_at' => null])->save();
        $this->postJson('/api/media')->assertForbidden();
    }

    public function test_audio_and_video_uploads_can_be_served(): void
    {
        $this->actingAs($this->person('editor'));
        foreach (['audio' => ['mp3', 'audio/mpeg'], 'video' => ['mp4', 'video/mp4']] as $kind => [$ext,$mime]) {
            $r = $this->postJson('/api/media', ['kind' => $kind, 'file' => UploadedFile::fake()->create('media.'.$ext, 10, $mime)])->assertCreated();
            $this->get($r->json('url'))->assertOk();
            $this->assertTrue(\App\Support\TrustedMediaUrl::isAllowed($r->json('url')));
        }
    }

    public function test_other_event_requires_a_name_and_clears_it_when_type_changes(): void
    {
        $this->actingAs($this->person('editor'));
        $data = ['titulo' => 'Encuentro', 'fecha' => '2026-12-01', 'hora' => '10:00', 'lugar' => 'Parroquia', 'encargado' => 'Secretaría', 'tipo_evento' => 'otro'];
        $this->postJson('/api/calendarios/eventos', $data)->assertUnprocessable()->assertJsonValidationErrors('tipo_evento_otro');
        $r = $this->postJson('/api/calendarios/eventos', $data + ['tipo_evento_otro' => 'Encuentro familiar'])->assertCreated()->assertJsonPath('tipo_evento_otro', 'Encuentro familiar');
        $data['tipo_evento'] = 'misa';
        $this->putJson('/api/calendarios/eventos/'.$r->json('id'), $data + ['tipo_evento_otro' => 'Texto anterior'])->assertOk()->assertJsonPath('tipo_evento_otro',null);
    }
}
