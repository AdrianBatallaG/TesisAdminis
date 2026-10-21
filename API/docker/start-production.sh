#!/bin/sh
set -eu
: "${APP_KEY:?Set a persistent APP_KEY in the hosting environment}"
: "${DB_HOST:?Set the MySQL host}"
mkdir -p storage/app/private storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs
chown -R www-data:www-data storage bootstrap/cache
sed -i "s/^Listen .*/Listen ${PORT:-80}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:.*>/<VirtualHost *:${PORT:-80}>/" /etc/apache2/sites-available/000-default.conf
php artisan config:cache
php artisan migrate --force
php artisan db:seed --class=RolesAndUsersSeeder --force
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/app.conf
