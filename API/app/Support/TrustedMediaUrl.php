<?php

namespace App\Support;

use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class TrustedMediaUrl
{
    public static function isAllowed(?string $url): bool
    {
        if (! is_string($url) || trim($url) === '') {
            return true;
        }

        if (str_starts_with($url, rtrim(config('app.url'), '/').'/api/media/') && preg_match('~/api/media/[a-zA-Z0-9]{40}\.(jpg|jpeg|png|webp|mp3|wav|ogg|m4a|mp4|webm|pdf)$~', $url)) return true;

        $parts = parse_url($url);

        if (! is_array($parts)) {
            return false;
        }

        $scheme = Str::lower((string) ($parts['scheme'] ?? ''));
        $host = Str::lower((string) ($parts['host'] ?? ''));

        if (! in_array($scheme, ['http', 'https'], true) || $host === '') {
            return false;
        }

        if (isset($parts['user']) || isset($parts['pass'])) {
            return false;
        }

        if (! self::isAllowedHost($host, $scheme)) {
            return false;
        }

        return true;
    }

    public static function validationMessage(string $fieldLabel = 'URL'): string
    {
        return sprintf(
            '%s debe usar http/https y apuntar solo a dominios confiables o recursos locales permitidos.',
            $fieldLabel
        );
    }

    private static function isAllowedHost(string $host, string $scheme): bool
    {
        if ($host === 'localhost' || $host === '127.0.0.1') {
            return app()->isLocal();
        }

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return self::isAllowedIp($host, $scheme);
        }

        $trustedDomains = self::trustedDomains();

        if ($trustedDomains->isEmpty()) {
            return true;
        }

        return $trustedDomains->contains(
            fn (string $trustedDomain): bool => $host === $trustedDomain || Str::endsWith($host, '.'.$trustedDomain)
        );
    }

    private static function isAllowedIp(string $ip, string $scheme): bool
    {
        if (in_array($ip, ['127.0.0.1', '::1'], true)) {
            return app()->isLocal();
        }

        $isPublic = filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) !== false;

        return $isPublic && $scheme === 'https';
    }

    /**
     * @return Collection<int, string>
     */
    private static function trustedDomains(): Collection
    {
        $configured = array_filter(array_map(
            static fn (string $domain): string => Str::lower(trim($domain)),
            explode(',', (string) env('TRUSTED_MEDIA_DOMAINS', ''))
        ));

        return collect($configured)->values();
    }
}
