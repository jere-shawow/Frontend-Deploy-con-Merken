#!/usr/bin/env bash
set -euo pipefail

directory=/docker/front-web
test -r "$directory/runtime.env"
docker network inspect merken >/dev/null
install -m 0644 deploy/compose.yaml "$directory/compose.yaml"
compose=(docker compose --project-name merken-frontend --project-directory "$directory" -f "$directory/compose.yaml")
export MERKEN_FRONTEND_IMAGE="merken-frontend:${GITHUB_SHA}"
previous=$(docker ps -a --filter label=com.docker.compose.project=merken-frontend --filter label=com.docker.compose.service=dashboard --format '{{.Image}}')

gzip -dc frontend.tar.gz | docker load
docker tag merken-frontend:ci "$MERKEN_FRONTEND_IMAGE"

if "${compose[@]}" up -d --no-build --pull never &&
  curl --fail --silent --show-error --retry 15 --retry-all-errors --retry-delay 2 --max-time 5 http://127.0.0.1:3001/ >/dev/null; then
  exit 0
fi

if [[ -n "$previous" && "$previous" != "$MERKEN_FRONTEND_IMAGE" ]]; then
  MERKEN_FRONTEND_IMAGE="$previous" "${compose[@]}" up -d --no-build --pull never
else
  "${compose[@]}" down
fi
exit 1
