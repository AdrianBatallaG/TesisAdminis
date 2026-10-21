# Despliegue de ADMINIS

## Base de datos

Usar MySQL 8.4 con utf8mb4 y un usuario propio de la aplicación. Mantener copias mediante mysqldump y probar su restauración. No subir dumps, claves ni datos personales a GitHub.

Render permite MySQL como servicio privado Docker con disco persistente en `/var/lib/mysql`, o puede utilizarse un proveedor externo de MySQL. Esta arquitectura requiere almacenamiento persistente; no asumir que un servicio gratuito conserva archivos.

## API en Render

- Crear un Web Service desde el repositorio, directorio raíz `API`, runtime Docker y archivo `Dockerfile.production`.
- Configurar las variables de `API/.env.production.example`, con valores reales desde el panel del proveedor. Generar APP_KEY una sola vez; conservar la existente si se migran datos.
- Conectar DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME y DB_PASSWORD al MySQL de destino. Si el proveedor exige TLS, configurar MYSQL_ATTR_SSL_CA con el certificado de su CA.
- Montar un disco persistente en `/var/www/html/storage/app`; allí se almacenan comprobantes privados y medios. Transferir los archivos existentes por un canal privado, no mediante Git.
- Usar `/up` como health check. El arranque aplica migraciones y roles; no crea cuentas con contraseñas predeterminadas. Crear el primer administrador con `php artisan users:create-admin`.
- El contenedor incluye Apache, la cola y el scheduler. Mantener una sola instancia mientras se use almacenamiento local y este scheduler integrado.

## Interfaz

Crear un Static Site con raíz `Frontend`, comando `npm ci && npm run build` y carpeta publicada `dist`. Definir `VITE_API_URL=https://api.su-dominio.com/api` antes de compilar y una reescritura `/*` a `/index.html` para React Router.

## Dominios, sesión y correo

Preferir subdominios del mismo dominio: `app.su-dominio.com` y `api.su-dominio.com`. Configurar APP_URL, FRONTEND_URL, CORS_ALLOWED_ORIGINS, SANCTUM_STATEFUL_DOMAINS y SESSION_DOMAIN de forma consistente. HTTPS y SESSION_SECURE_COOKIE=true son necesarios en producción. La autenticación usa cookies; dominios distintos pueden quedar bloqueados por restricciones de cookies de terceros.

Configurar SMTP y verificar el envío de correos antes de habilitar solicitudes públicas. Los usuarios necesitan correo verificado.

## Comprobaciones posteriores

Validar acceso y permisos, verificación de correo, subida de comprobantes, tickets, notificaciones, exportaciones, reproducción de archivos y persistencia después de reiniciar el servicio. Actualizar las URLs locales de medios guardadas en la base si se traslada una instalación existente a otro dominio.

Referencias oficiales: https://render.com/docs/deploy-mysql · https://render.com/docs/docker · https://render.com/docs/disks
