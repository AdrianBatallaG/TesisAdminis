<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaUploadController extends Controller
{
    public function store(Request $request)
    {
        $request->validate(['kind' => 'required|in:image,audio,video,resource', 'file' => 'required|file|max:51200']);
        $rules = match ($request->input('kind')) {
            'image' => ['image', 'mimes:jpg,jpeg,png,webp', 'extensions:jpg,jpeg,png,webp', 'max:5120'],
            'audio' => ['mimetypes:audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/x-m4a', 'extensions:mp3,wav,ogg,m4a'],
            'video' => ['mimetypes:video/mp4,video/webm', 'extensions:mp4,webm'],
            default => ['mimes:jpg,jpeg,png,webp,mp3,wav,ogg,m4a,mp4,webm,pdf', 'extensions:jpg,jpeg,png,webp,mp3,wav,ogg,m4a,mp4,webm,pdf'],
        };
        $request->validate(['file' => $rules]);
        $path = $request->file('file')->storeAs('public-media', Str::random(40).'.'.strtolower($request->file('file')->getClientOriginalExtension()), 'local');
        abort_unless($path, 500);
        AuditLogger::log($request, 'medios', 'subir_archivo', null, 'Archivo multimedia subido.');

        return response()->json(['url' => route('media.file', ['name' => basename($path)]), 'name' => $request->file('file')->getClientOriginalName()], 201);
    }

    public function file(string $name)
    {
        abort_unless(preg_match('/^[a-zA-Z0-9]{40}\.(jpg|jpeg|png|webp|mp3|wav|ogg|m4a|mp4|webm|pdf)$/', $name), 404);
        abort_unless(Storage::disk('local')->exists('public-media/'.$name), 404);

        return response()->file(Storage::disk('local')->path('public-media/'.$name), ['X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'public, max-age=86400']);
    }
}
