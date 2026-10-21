# API Laravel + Sanctum + Roles

## Video de inicio

`GET /api/inicio/video` devuelve la URL del video publicado (o `null` para usar el video original del frontend).
Administradores y editores verificados pueden reemplazarlo desde la portada mediante
`POST /api/inicio/video`, con el archivo multipart `video` en formato MP4 o WebM, hasta 50 MB.
Las cuentas inactivas o con bloqueo de actividad no pueden modificarlo.

Ejecuta `php artisan migrate` antes de usar esta función. Los archivos se guardan en
el disco local de Laravel y se sirven mediante `/api/inicio/video/archivo`, con soporte
de rangos de bytes; no requiere enlaces simbólicos de almacenamiento.

En PHP configura `upload_max_filesize=50M` y `post_max_size=55M` (ver `docker/uploads.ini`).
La imagen Docker incluye estos valores después de reconstruirla. Si usas un proxy,
su límite de carga también debe permitir 55 MB.

API REST construida con Laravel 12, Sanctum y Spatie Permission.

## Caracteristicas

- Registro (`POST /api/register`) con rol inicial `usuario`.
- Login (`POST /api/login`) con token Sanctum.
- Verificacion de correo obligatoria para iniciar sesion.
- Envio de correo de verificacion por Resend.
- Roles: `usuario`, `editor`, `admin`.
- Panel admin para listar usuarios y cambiar roles.

## Requisitos

- PHP 8.2+
- Composer
- SQLite (incluida) o MySQL/PostgreSQL

## Configuracion

1. Copia `.env.example` a `.env`.
2. Configura, como minimo:

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

MAIL_MAILER=resend
RESEND_API_KEY=tu_api_key_resend
MAIL_FROM_ADDRESS=noreply@tudominio.com
MAIL_FROM_NAME="Tu Proyecto"
```

3. Instala dependencias y prepara BD:

```bash
composer install
php artisan key:generate
php artisan migrate --seed
```

4. Levanta la API:

```bash
php artisan serve
```

## Usuarios seed por defecto

- Admin: `admin@example.com` / `admin12345`
- Editor: `editor@example.com` / `editor12345`
- Usuario: `usuario@example.com` / `usuario12345`

Puedes cambiarlos en `.env` con variables `DEFAULT_*` antes de ejecutar `php artisan migrate --seed`.

## Endpoints principales

- `POST /api/register`
- `POST /api/login`
- `POST /api/logout` (auth:sanctum)
- `GET /api/me` (auth:sanctum)
- `POST /api/email/verification-notification`
- `GET /api/email/verify/{id}/{hash}?expires=...&signature=...`
- `GET /api/admin/roles` (admin)
- `GET /api/admin/users` (admin)
- `PATCH /api/admin/users/{user}/role` (admin)
