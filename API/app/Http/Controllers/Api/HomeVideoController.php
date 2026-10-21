<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class HomeVideoController extends Controller
{
    private function library(): array
    {
        $v = SiteSetting::where('key', 'home_video')->first()?->value ?? [];
        if (! isset($v['videos'])) {
            $v = ['mode' => 'fixed', 'selected' => isset($v['path']) ? basename($v['path']) : null, 'videos' => isset($v['path']) ? [['id' => basename($v['path']), 'path' => $v['path'], 'name' => 'Video anterior']] : []];
        }

        return $v;
    }

    private function url($video)
    {
        return route('home-video.file').'?v='.rawurlencode($video['id']);
    }

    public function show()
    {
        $v = $this->library();
        $videos = array_values(array_filter($v['videos'], fn ($i) => Storage::disk('local')->exists($i['path'])));
        $selected = collect($videos)->firstWhere('id', $v['selected'] ?? null);
        if (($v['mode'] ?? 'fixed') === 'random' && count($videos)) {
            $selected = $videos[random_int(0, count($videos) - 1)];
        }

return response()->json(['url' => $selected ? $this->url($selected) : null])->header('Cache-Control', 'no-store');
    }

    public function index()
    {
        $v = $this->library();

        return response()->json(['mode' => $v['mode'], 'selected' => $v['selected'], 'videos' => array_map(fn ($i) => ['id' => $i['id'], 'name' => $i['name'], 'url' => $this->url($i)], $v['videos'])]);
    }

    public function file(Request $request)
    {
        $v = $this->library();
        $id = $request->query('v', $v['selected']);
        $item = collect($v['videos'])->firstWhere('id', $id);
        abort_unless($item && Storage::disk('local')->exists($item['path']), 404);

        return response()->file(Storage::disk('local')->path($item['path']), ['Cache-Control' => 'public, max-age=86400', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function update(Request $request)
    {
        $request->validate(['video' => 'required|file|mimetypes:video/mp4,video/webm|extensions:mp4,webm|max:51200']);
        $path = $request->file('video')->store('home-videos', 'local');
        abort_unless($path, 500);
        try {
            DB::transaction(function () use ($request, $path) {
                $setting = SiteSetting::firstOrCreate(['key' => 'home_video']);
                SiteSetting::whereKey($setting->id)->lockForUpdate()->firstOrFail();
                $v = $this->library();
                $id = basename($path);
                $v['videos'][] = ['id' => $id, 'path' => $path, 'name' => $request->file('video')->getClientOriginalName()];
                if (! $v['selected']) {
                    $v['selected'] = $id;
                }$setting->update(['value' => $v]);
                AuditLogger::log($request, 'inicio', 'subir_video', $setting, 'Video agregado a la biblioteca.');
            });
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($path);
            throw $e;
        }

        return $this->index();
    }

    public function configure(Request $request)
    {
        $data = $request->validate(['mode' => 'required|in:fixed,random', 'selected' => 'nullable|string|max:150']);

        return DB::transaction(function () use ($request, $data) {
            $setting = SiteSetting::firstOrCreate(['key' => 'home_video']);
            SiteSetting::whereKey($setting->id)->lockForUpdate()->firstOrFail();
            $v = $this->library();
            abort_unless(empty($data['selected']) || collect($v['videos'])->contains('id', $data['selected']), 422, 'Selecciona un video de la biblioteca.');
            abort_if($data['mode'] === 'random' && ! count($v['videos']), 422, 'Sube al menos un video.');
            $v['mode'] = $data['mode'];
            $v['selected'] = $data['selected'] ?? null;
            $setting->update(['value' => $v]);
            AuditLogger::log($request, 'inicio', 'configurar_videos', $setting, 'Reproducción de inicio configurada.');

            return $this->index();
        });
    }
}
