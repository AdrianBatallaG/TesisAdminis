<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PastoralContent;
use App\Support\AuditLogger;
use App\Support\TrustedMediaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PastoralContentController extends Controller
{
    /**
     * @var list<string>
     */
    private array $pastoralTypes = ['homilia', 'reflexion', 'documento', 'galeria', 'anuncio'];

    public function videos(): JsonResponse
    {
        $items = PastoralContent::query()
            ->where('tipo', 'video')
            ->latest('fecha_publicacion')
            ->get()
            ->map(fn (PastoralContent $item) => $this->formatVideo($item));

        return response()->json($items);
    }

    public function storeVideo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string'],
            'url' => ['required', 'url', 'max:500'],
        ]);

        $this->ensureTrustedUrl('url', $validated['url'], 'La URL del video');

        $item = PastoralContent::create([
            'tipo' => 'video',
            'titulo' => $validated['titulo'],
            'contenido' => $validated['descripcion'] ?? null,
            'url' => $validated['url'],
            'fecha_publicacion' => now(),
            'autor_nombre' => $request->user()?->name,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'contenido', 'crear_video', $item, 'Video pastoral creado.', [], $item->toArray());

        return response()->json($this->formatVideo($item), 201);
    }

    public function deleteVideo(Request $request, PastoralContent $video): JsonResponse
    {
        abort_if($video->tipo !== 'video', 404, 'Video no encontrado.');

        $oldValues = $video->toArray();
        $video->delete();

        AuditLogger::log($request, 'contenido', 'eliminar_video', null, 'Video pastoral eliminado.', $oldValues, []);

        return response()->json([
            'message' => 'Video eliminado correctamente.',
        ]);
    }

    public function publicaciones(): JsonResponse
    {
        $items = PastoralContent::query()
            ->where('tipo', 'publicacion')
            ->latest('fecha_publicacion')
            ->get()
            ->map(fn (PastoralContent $item) => $this->formatPublication($item));

        return response()->json($items);
    }

    public function storePublicacion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'contenido' => ['required', 'string'],
            'imagen_url' => ['nullable', 'string', 'max:500'],
        ]);

        $this->ensureTrustedUrl('imagen_url', $validated['imagen_url'] ?? null, 'La URL de imagen');

        $item = PastoralContent::create([
            'tipo' => 'publicacion',
            'titulo' => $validated['titulo'],
            'contenido' => $validated['contenido'],
            'imagen_url' => $validated['imagen_url'] ?? null,
            'fecha_publicacion' => now(),
            'autor_nombre' => $request->user()?->name,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'contenido', 'crear_publicacion', $item, 'Publicación pastoral creada.', [], $item->toArray());

        return response()->json($this->formatPublication($item), 201);
    }

    public function updatePublicacion(Request $request, PastoralContent $publicacion): JsonResponse
    {
        abort_if($publicacion->tipo !== 'publicacion', 404, 'Publicación no encontrada.');

        $validated = $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'contenido' => ['required', 'string'],
            'imagen_url' => ['nullable', 'string', 'max:500'],
        ]);

        $this->ensureTrustedUrl('imagen_url', $validated['imagen_url'] ?? null, 'La URL de imagen');

        $oldValues = $publicacion->toArray();
        $publicacion->update([
            'titulo' => $validated['titulo'],
            'contenido' => $validated['contenido'],
            'imagen_url' => $validated['imagen_url'] ?? $publicacion->imagen_url,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log(
            $request,
            'contenido',
            'editar_publicacion',
            $publicacion,
            'Publicación pastoral actualizada.',
            $oldValues,
            $publicacion->fresh()->toArray()
        );

        return response()->json($this->formatPublication($publicacion->fresh()));
    }

    public function deletePublicacion(Request $request, PastoralContent $publicacion): JsonResponse
    {
        abort_if($publicacion->tipo !== 'publicacion', 404, 'Publicación no encontrada.');

        $oldValues = $publicacion->toArray();
        $publicacion->delete();

        AuditLogger::log($request, 'contenido', 'eliminar_publicacion', null, 'Publicación pastoral eliminada.', $oldValues, []);

        return response()->json([
            'message' => 'Publicación eliminada correctamente.',
        ]);
    }

    public function articulos(): JsonResponse
    {
        $items = PastoralContent::query()
            ->where('tipo', 'articulo')
            ->latest('fecha_publicacion')
            ->get()
            ->map(fn (PastoralContent $item) => $this->formatArticulo($item));

        return response()->json($items);
    }

    public function storeArticulo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'contenido' => ['nullable', 'string'],
            'imagen_url' => ['nullable', 'string', 'max:500'],
            'precio' => ['required', 'numeric', 'min:0'],
            'stock' => ['nullable', 'integer', 'min:0'],
        ]);

        $this->ensureTrustedUrl('imagen_url', $validated['imagen_url'] ?? null, 'La URL de imagen');

        $item = PastoralContent::create([
            'tipo' => 'articulo',
            'titulo' => $validated['titulo'],
            'contenido' => $validated['contenido'] ?? null,
            'imagen_url' => $validated['imagen_url'] ?? null,
            'precio' => $validated['precio'],
            'stock' => $validated['stock'] ?? null,
            'fecha_publicacion' => now(),
            'autor_nombre' => $request->user()?->name,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'articulos', 'crear_articulo', $item, 'Artículo de venta creado.', [], $item->toArray());

        return response()->json($this->formatArticulo($item), 201);
    }

    public function updateArticulo(Request $request, PastoralContent $articulo): JsonResponse
    {
        abort_if($articulo->tipo !== 'articulo', 404, 'Artículo no encontrado.');

        $validated = $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'contenido' => ['nullable', 'string'],
            'imagen_url' => ['nullable', 'string', 'max:500'],
            'precio' => ['required', 'numeric', 'min:0'],
            'stock' => ['nullable', 'integer', 'min:0'],
        ]);

        $this->ensureTrustedUrl('imagen_url', $validated['imagen_url'] ?? null, 'La URL de imagen');

        $oldValues = $articulo->toArray();
        $articulo->update([
            'titulo' => $validated['titulo'],
            'contenido' => $validated['contenido'] ?? null,
            'imagen_url' => $validated['imagen_url'] ?? null,
            'precio' => $validated['precio'],
            'stock' => $validated['stock'] ?? null,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log(
            $request,
            'articulos',
            'editar_articulo',
            $articulo,
            'Artículo de venta actualizado.',
            $oldValues,
            $articulo->fresh()->toArray()
        );

        return response()->json($this->formatArticulo($articulo->fresh()));
    }

    public function deleteArticulo(Request $request, PastoralContent $articulo): JsonResponse
    {
        abort_if($articulo->tipo !== 'articulo', 404, 'Artículo no encontrado.');

        $oldValues = $articulo->toArray();
        $articulo->delete();

        AuditLogger::log($request, 'articulos', 'eliminar_articulo', null, 'Artículo de venta eliminado.', $oldValues, []);

        return response()->json([
            'message' => 'Artículo eliminado correctamente.',
        ]);
    }

    public function ninosJovenes(): JsonResponse
    {
        $items = PastoralContent::query()
            ->where('tipo', 'ninos_jovenes')
            ->latest('fecha_publicacion')
            ->get()
            ->map(fn (PastoralContent $item) => $this->formatNinosJovenes($item));

        return response()->json($items);
    }

    public function showNinosJovenes(PastoralContent $recurso): JsonResponse
    {
        abort_if($recurso->tipo !== 'ninos_jovenes', 404, 'Recurso no encontrado.');

        return response()->json($this->formatNinosJovenes($recurso));
    }

    public function storeNinosJovenes(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'contenido' => ['required', 'string'],
            'subtipo' => ['required', Rule::in(['juego', 'actividad', 'lectura', 'recurso', 'otro'])],
            'url' => ['nullable', 'string', 'max:500'],
            'imagen_url' => ['nullable', 'string', 'max:500'],
            'edad_min' => ['nullable', 'integer', 'min:0'],
            'edad_max' => ['nullable', 'integer', 'min:0'],
            'duracion_minutos' => ['nullable', 'integer', 'min:0'],
        ]);

        $this->ensureTrustedUrl('url', $validated['url'] ?? null, 'La URL del recurso');
        $this->ensureTrustedUrl('imagen_url', $validated['imagen_url'] ?? null, 'La URL de imagen');

        $item = PastoralContent::create([
            'tipo' => 'ninos_jovenes',
            'titulo' => $validated['titulo'],
            'contenido' => $validated['contenido'],
            'subtipo' => $validated['subtipo'],
            'url' => $validated['url'] ?? null,
            'imagen_url' => $validated['imagen_url'] ?? null,
            'edad_min' => $validated['edad_min'] ?? null,
            'edad_max' => $validated['edad_max'] ?? null,
            'duracion_minutos' => $validated['duracion_minutos'] ?? null,
            'fecha_publicacion' => now(),
            'autor_nombre' => $request->user()?->name,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'ninos_jovenes', 'crear_recurso', $item, 'Recurso para niños y jóvenes creado.', [], $item->toArray());

        return response()->json($this->formatNinosJovenes($item), 201);
    }

    public function updateNinosJovenes(Request $request, PastoralContent $recurso): JsonResponse
    {
        abort_if($recurso->tipo !== 'ninos_jovenes', 404, 'Recurso no encontrado.');

        $validated = $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'contenido' => ['required', 'string'],
            'subtipo' => ['required', Rule::in(['juego', 'actividad', 'lectura', 'recurso', 'otro'])],
            'url' => ['nullable', 'string', 'max:500'],
            'imagen_url' => ['nullable', 'string', 'max:500'],
            'edad_min' => ['nullable', 'integer', 'min:0'],
            'edad_max' => ['nullable', 'integer', 'min:0'],
            'duracion_minutos' => ['nullable', 'integer', 'min:0'],
        ]);

        $this->ensureTrustedUrl('url', $validated['url'] ?? null, 'La URL del recurso');
        $this->ensureTrustedUrl('imagen_url', $validated['imagen_url'] ?? null, 'La URL de imagen');

        $oldValues = $recurso->toArray();
        $recurso->update([
            'titulo' => $validated['titulo'],
            'contenido' => $validated['contenido'],
            'subtipo' => $validated['subtipo'],
            'url' => $validated['url'] ?? null,
            'imagen_url' => $validated['imagen_url'] ?? null,
            'edad_min' => $validated['edad_min'] ?? null,
            'edad_max' => $validated['edad_max'] ?? null,
            'duracion_minutos' => $validated['duracion_minutos'] ?? null,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log(
            $request,
            'ninos_jovenes',
            'editar_recurso',
            $recurso,
            'Recurso para niños y jóvenes actualizado.',
            $oldValues,
            $recurso->fresh()->toArray()
        );

        return response()->json($this->formatNinosJovenes($recurso->fresh()));
    }

    public function deleteNinosJovenes(Request $request, PastoralContent $recurso): JsonResponse
    {
        abort_if($recurso->tipo !== 'ninos_jovenes', 404, 'Recurso no encontrado.');

        $oldValues = $recurso->toArray();
        $recurso->delete();

        AuditLogger::log($request, 'ninos_jovenes', 'eliminar_recurso', null, 'Recurso para niños y jóvenes eliminado.', $oldValues, []);

        return response()->json([
            'message' => 'Recurso eliminado correctamente.',
        ]);
    }

    public function pastoralContents(Request $request): JsonResponse
    {
        $query = PastoralContent::query()
            ->where('tipo', 'pastoral')
            ->latest('fecha_publicacion');

        if ($request->filled('subtipo')) {
            $query->where('subtipo', $request->string('subtipo'));
        }

        if ($request->filled('q')) {
            $search = $request->string('q');
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('titulo', 'like', '%'.$search.'%')
                    ->orWhere('contenido', 'like', '%'.$search.'%');
            });
        }

        $items = $query
            ->get()
            ->map(fn (PastoralContent $item) => $this->formatPastoral($item));

        return response()->json($items);
    }

    public function storePastoral(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subtipo' => ['required', 'string', Rule::in($this->pastoralTypes)],
            'titulo' => ['required', 'string', 'max:255'],
            'contenido' => ['nullable', 'string'],
            'url' => ['nullable', 'string', 'max:500'],
            'imagen_url' => ['nullable', 'string', 'max:500'],
            'datos_extra' => ['nullable', 'array'],
        ]);

        $this->ensureTrustedUrl('url', $validated['url'] ?? null, 'La URL principal');
        $this->ensureTrustedUrl('imagen_url', $validated['imagen_url'] ?? null, 'La URL de imagen');

        $subtype = $validated['subtipo'];
        $extraData = $this->normalizePastoralExtra($subtype, $validated['datos_extra'] ?? []);
        $this->validatePastoralRules($subtype, $validated, $extraData);

        $item = PastoralContent::create([
            'tipo' => 'pastoral',
            'subtipo' => $subtype,
            'titulo' => $validated['titulo'],
            'contenido' => $validated['contenido'] ?? null,
            'url' => $validated['url'] ?? null,
            'imagen_url' => $validated['imagen_url'] ?? null,
            'datos_extra' => $extraData,
            'fecha_publicacion' => now(),
            'autor_nombre' => $request->user()?->name,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log($request, 'contenido_pastoral', 'crear', $item, 'Contenido pastoral creado.', [], $item->toArray());

        return response()->json($this->formatPastoral($item), 201);
    }

    public function updatePastoral(Request $request, PastoralContent $contenido): JsonResponse
    {
        abort_if($contenido->tipo !== 'pastoral', 404, 'Contenido pastoral no encontrado.');

        $validated = $request->validate([
            'subtipo' => ['required', 'string', Rule::in($this->pastoralTypes)],
            'titulo' => ['required', 'string', 'max:255'],
            'contenido' => ['nullable', 'string'],
            'url' => ['nullable', 'string', 'max:500'],
            'imagen_url' => ['nullable', 'string', 'max:500'],
            'datos_extra' => ['nullable', 'array'],
        ]);

        $this->ensureTrustedUrl('url', $validated['url'] ?? null, 'La URL principal');
        $this->ensureTrustedUrl('imagen_url', $validated['imagen_url'] ?? null, 'La URL de imagen');

        $subtype = $validated['subtipo'];
        $extraData = $this->normalizePastoralExtra($subtype, $validated['datos_extra'] ?? []);
        $this->validatePastoralRules($subtype, $validated, $extraData);

        $oldValues = $contenido->toArray();
        $contenido->update([
            'subtipo' => $subtype,
            'titulo' => $validated['titulo'],
            'contenido' => $validated['contenido'] ?? null,
            'url' => $validated['url'] ?? null,
            'imagen_url' => $validated['imagen_url'] ?? null,
            'datos_extra' => $extraData,
            'updated_by' => $request->user()?->id,
        ]);

        AuditLogger::log(
            $request,
            'contenido_pastoral',
            'editar',
            $contenido,
            'Contenido pastoral actualizado.',
            $oldValues,
            $contenido->fresh()->toArray()
        );

        return response()->json($this->formatPastoral($contenido->fresh()));
    }

    public function deletePastoral(Request $request, PastoralContent $contenido): JsonResponse
    {
        abort_if($contenido->tipo !== 'pastoral', 404, 'Contenido pastoral no encontrado.');

        $oldValues = $contenido->toArray();
        $contenido->delete();

        AuditLogger::log($request, 'contenido_pastoral', 'eliminar', null, 'Contenido pastoral eliminado.', $oldValues, []);

        return response()->json([
            'message' => 'Contenido pastoral eliminado correctamente.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $extraData
     * @return array<string, mixed>
     */
    private function normalizePastoralExtra(string $subtype, array $extraData): array
    {
        $normalized = $extraData;

        if ($subtype === 'galeria') {
            $images = $normalized['imagenes'] ?? [];

            if (is_string($images)) {
                $images = preg_split('/\r\n|\r|\n/', $images) ?: [];
            }

            if (is_array($images)) {
                $images = collect($images)
                    ->map(static fn ($value) => trim((string) $value))
                    ->filter(static fn (string $value) => $value !== '')
                    ->values()
                    ->all();
            } else {
                $images = [];
            }

            $normalized['imagenes'] = $images;
            $normalized['album'] = isset($normalized['album']) ? trim((string) $normalized['album']) : null;
            $normalized['fecha_evento'] = isset($normalized['fecha_evento']) ? trim((string) $normalized['fecha_evento']) : null;
        }

        if ($subtype === 'documento') {
            $normalized['formato'] = isset($normalized['formato']) ? trim((string) $normalized['formato']) : null;
        }

        if ($subtype === 'homilia') {
            $normalized['audio_url'] = isset($normalized['audio_url']) ? trim((string) $normalized['audio_url']) : null;
        }

        if ($subtype === 'galeria' && isset($normalized['imagenes']) && is_array($normalized['imagenes'])) {
            foreach ($normalized['imagenes'] as $imageUrl) {
                $this->ensureTrustedUrl('datos_extra.imagenes', $imageUrl, 'Cada URL de galeria');
            }
        }

        if ($subtype === 'homilia') {
            $this->ensureTrustedUrl('datos_extra.audio_url', $normalized['audio_url'] ?? null, 'La URL de audio');
        }

        return $normalized;
    }

    private function ensureTrustedUrl(string $field, ?string $url, string $label): void
    {
        if (! TrustedMediaUrl::isAllowed($url)) {
            throw ValidationException::withMessages([
                $field => [TrustedMediaUrl::validationMessage($label)],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array<string, mixed>  $extraData
     */
    private function validatePastoralRules(string $subtype, array $validated, array $extraData): void
    {
        $errors = [];

        if ($subtype === 'homilia' && trim((string) ($validated['contenido'] ?? '')) === '') {
            $errors['contenido'][] = 'La homilía debe incluir el texto completo.';
        }

        if ($subtype === 'reflexion' && trim((string) ($validated['contenido'] ?? '')) === '') {
            $errors['contenido'][] = 'La reflexión diaria requiere un mensaje.';
        }

        if ($subtype === 'documento' && trim((string) ($validated['url'] ?? '')) === '') {
            $errors['url'][] = 'Debes adjuntar el enlace del documento formativo.';
        }

        if ($subtype === 'galeria') {
            $images = $extraData['imagenes'] ?? [];
            if (! is_array($images) || count($images) === 0) {
                $errors['datos_extra.imagenes'][] = 'La galería debe incluir al menos una imagen.';
            }
        }

        if ($subtype === 'anuncio' && trim((string) ($validated['contenido'] ?? '')) === '') {
            $errors['contenido'][] = 'El anuncio general debe tener contenido.';
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function formatVideo(PastoralContent $item): array
    {
        return [
            'id' => $item->id,
            'titulo' => $item->titulo,
            'descripcion' => $item->contenido,
            'url' => $item->url,
            'fecha' => optional($item->fecha_publicacion)->toDateString(),
            'autor' => $item->autor_nombre,
        ];
    }

    private function formatPublication(PastoralContent $item): array
    {
        return [
            'id' => $item->id,
            'titulo' => $item->titulo,
            'contenido' => $item->contenido,
            'imagen' => $item->imagen_url,
            'fecha' => optional($item->fecha_publicacion)->toDateString(),
            'autor' => $item->autor_nombre,
        ];
    }

    private function formatArticulo(PastoralContent $item): array
    {
        return [
            'id' => $item->id,
            'titulo' => $item->titulo,
            'descripcion' => $item->contenido,
            'imagen' => $item->imagen_url,
            'precio' => $item->precio !== null ? (float) $item->precio : null,
            'stock' => $item->stock,
            'fecha' => optional($item->fecha_publicacion)->toDateString(),
            'autor' => $item->autor_nombre,
        ];
    }

    private function formatNinosJovenes(PastoralContent $item): array
    {
        return [
            'id' => $item->id,
            'titulo' => $item->titulo,
            'contenido' => $item->contenido,
            'subtipo' => $item->subtipo,
            'url' => $item->url,
            'imagen' => $item->imagen_url,
            'edad_min' => $item->edad_min,
            'edad_max' => $item->edad_max,
            'duracion_minutos' => $item->duracion_minutos,
            'fecha' => optional($item->fecha_publicacion)->toDateString(),
            'autor' => $item->autor_nombre,
        ];
    }

    private function formatPastoral(PastoralContent $item): array
    {
        return [
            'id' => $item->id,
            'tipo' => $item->subtipo,
            'titulo' => $item->titulo,
            'contenido' => $item->contenido,
            'url' => $item->url,
            'imagen' => $item->imagen_url,
            'datos_extra' => $item->datos_extra ?? [],
            'fecha' => optional($item->fecha_publicacion)->toDateString(),
            'autor' => $item->autor_nombre,
        ];
    }
}
