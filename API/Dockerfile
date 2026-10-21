FROM php:8.4-cli-alpine

WORKDIR /var/www/html

RUN apk add --no-cache bash curl git icu-dev libzip-dev oniguruma-dev sqlite sqlite-dev mysql-client \
    freetype-dev libjpeg-turbo-dev libpng-dev \
    && docker-php-ext-configure intl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install bcmath gd intl mbstring pdo pdo_mysql pdo_sqlite zip \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

COPY docker/start.sh /usr/local/bin/start-api
COPY docker/uploads.ini /usr/local/etc/php/conf.d/uploads.ini
RUN chmod +x /usr/local/bin/start-api

EXPOSE 8000

CMD ["start-api"]
