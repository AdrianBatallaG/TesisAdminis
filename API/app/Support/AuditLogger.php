<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class AuditLogger
{
    /**
     * @param  array<string, mixed>  $oldValues
     * @param  array<string, mixed>  $newValues
     */
    public static function log(
        Request $request,
        string $module,
        string $action,
        ?Model $entity = null,
        ?string $description = null,
        array $oldValues = [],
        array $newValues = []
    ): void {
        [$sanitizedOldValues, $sanitizedNewValues] = self::sanitizeSnapshots($oldValues, $newValues);

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'modulo' => $module,
            'accion' => $action,
            'entidad_tipo' => $entity ? $entity::class : null,
            'entidad_id' => $entity?->getKey(),
            'descripcion' => $description,
            'valores_anteriores' => empty($sanitizedOldValues) ? null : $sanitizedOldValues,
            'valores_nuevos' => empty($sanitizedNewValues) ? null : $sanitizedNewValues,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $oldValues
     * @param  array<string, mixed>  $newValues
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private static function sanitizeSnapshots(array $oldValues, array $newValues): array
    {
        if (! empty($oldValues) && ! empty($newValues)) {
            $changedKeys = collect(array_keys(array_merge($oldValues, $newValues)))
                ->filter(static fn (string $key): bool => Arr::get($oldValues, $key) !== Arr::get($newValues, $key))
                ->values()
                ->all();

            $oldValues = Arr::only($oldValues, $changedKeys);
            $newValues = Arr::only($newValues, $changedKeys);
        }

        return [
            self::sanitizeValue($oldValues),
            self::sanitizeValue($newValues),
        ];
    }

    /**
     * @param  mixed  $value
     * @return mixed
     */
    private static function sanitizeValue($value)
    {
        if (is_array($value)) {
            $sanitized = [];

            foreach ($value as $key => $nestedValue) {
                $sanitized[$key] = self::sanitizeByKey((string) $key, $nestedValue);
            }

            return $sanitized;
        }

        return $value;
    }

    /**
     * @param  mixed  $value
     * @return mixed
     */
    private static function sanitizeByKey(string $key, $value)
    {
        $normalizedKey = Str::lower($key);

        if (is_array($value)) {
            return self::sanitizeValue($value);
        }

        if (Str::contains($normalizedKey, ['token', 'password', 'secret'])) {
            return '[redacted]';
        }

        if (Str::contains($normalizedKey, ['nota', 'notas', 'descripcion'])) {
            return is_null($value) || $value === '' ? $value : '[redacted]';
        }

        if (Str::contains($normalizedKey, ['identificacion', 'cedula', 'documento'])) {
            return self::maskIdentifierValue($value);
        }

        if (Str::contains($normalizedKey, ['email'])) {
            return self::maskEmailValue($value);
        }

        return $value;
    }

    /**
     * @param  mixed  $value
     */
    public static function maskEmailValue($value): mixed
    {
        if (! is_string($value) || ! str_contains($value, '@')) {
            return $value;
        }

        [$localPart, $domain] = explode('@', $value, 2);
        $visible = substr($localPart, 0, min(2, strlen($localPart)));

        return $visible.'***@'.$domain;
    }

    /**
     * @param  mixed  $value
     */
    public static function maskIdentifierValue($value): mixed
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return $value;
        }

        $stringValue = (string) $value;
        $suffix = substr($stringValue, -4);

        return str_repeat('*', max(strlen($stringValue) - 4, 0)).$suffix;
    }
}
