FROM fragcolor/shards-headless:latest

RUN dnf install -y \
  bash \
  curl \
  ca-certificates \
  sqlite \
  && dnf clean all

WORKDIR /app

COPY db.sql seed.shs run.shs server.shs server-base.shs entrypoint.sh ./
COPY results/ ./results/

VOLUME ["/data"]

EXPOSE 8080

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
