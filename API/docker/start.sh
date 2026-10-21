#!/bin/sh
set -eu

cd /var/www/html

if [ ! -f .env ]; then
  cp .env.example .env
fi

if [ ! -f vendor/autoload.php ]; then
  composer install --no-interaction --prefer-dist
fi

if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
  mkdir -p database
  touch database/database.sqlite
fi

if ! grep -q '^APP_KEY=base64:' .env; then
  php artisan key:generate --force
fi

if [ "${DB_CONNECTION:-sqlite}" = "mysql" ]; then
  echo "Esperando a MySQL en ${DB_HOST:-mysql}:${DB_PORT:-3306}..."
  until php -r '
    $dsn = sprintf(
        "mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4",
        getenv("DB_HOST") ?: "mysql",
        getenv("DB_PORT") ?: "3306",
        getenv("DB_DATABASE") ?: "mysql"
    );
    new PDO($dsn, getenv("DB_USERNAME") ?: "root", getenv("DB_PASSWORD") ?: "");
  ' >/dev/null 2>&1; do
    sleep 2
  done
fi

php artisan config:clear
php artisan migrate --seed --force

php artisan schedule:work --no-interaction >/tmp/schedule.log 2>&1 &

exec php artisan serve --host=0.0.0.0 --port=8000
