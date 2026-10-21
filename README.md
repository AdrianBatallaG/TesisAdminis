# ADMINIS — Gestión parroquial

Aplicación para administrar sacramentos, solicitudes, donaciones, contenidos y actividades parroquiales. Backend Laravel 12, frontend React/Vite y base de datos MySQL 8.4.

## Desarrollo local

1. Copiar `.env.example` a `.env` en la raíz y definir contraseñas distintas para MySQL y root.
2. Copiar `API/.env.example` a `API/.env` y configurar `DB_CONNECTION=mysql`, host, base y credenciales. No versionar los archivos `.env`.
3. Iniciar la base: `docker compose up -d mysql`.
4. En `API`: `composer install`, `php artisan key:generate`, `php artisan migrate --seed` y `php artisan users:create-admin`.
5. Ejecutar `php artisan serve`, `php artisan queue:work` y `php artisan schedule:work`.
6. En `Frontend`: `npm ci` y `npm run dev`. API en localhost:8000; interfaz en localhost:5173.

También se puede iniciar el entorno de desarrollo completo con `docker compose up -d --build`.

## Importar una instalación SQLite existente

- Detener escrituras, cola y scheduler antes de crear un respaldo consistente de SQLite. Conservar también `API/storage/app` y la clave `APP_KEY` original.
- Configurar una base MySQL **nueva y vacía**. Ejecutar `php artisan migrate --force`, sin ejecutar seeders antes de importar.
- Ejecutar `php artisan database:import-sqlite /ruta/absoluta/respaldo.sqlite`.
- El comando conserva IDs, relaciones y hashes; compara cantidades de registros y realiza la copia en una transacción. No modifica el respaldo ni reemplaza tablas con datos. Se incluyen sesiones, tokens, cachés y auditoría; el historial de migraciones del destino lo establece Laravel al crear su esquema.
- Verificar acceso, tickets, archivos y reportes antes de reanudar los servicios. Conservar el respaldo privado para recuperación.

## Despliegue

Consultar [la guía de despliegue](docs/DEPLOYMENT.md). Los archivos subidos y los datos personales **no** forman parte del repositorio.

## Validación

- `cd API && php artisan test` (base SQLite aislada en memoria para pruebas).
- `cd Frontend && npm ci && npm run build`.
- `cd Frontend && node --test src/services/bibleService.test.js`.

La aplicación usa MySQL; SQLite permanece como herramienta para importar instalaciones previas y ejecutar pruebas aisladas.
