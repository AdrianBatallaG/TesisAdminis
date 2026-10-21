FROM node:20-alpine

WORKDIR /app

COPY docker/start.sh /usr/local/bin/start-frontend
RUN chmod +x /usr/local/bin/start-frontend

EXPOSE 5173

CMD ["start-frontend"]
