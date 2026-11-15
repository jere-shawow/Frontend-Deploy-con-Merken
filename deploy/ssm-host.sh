#!/usr/bin/env bash
set -euo pipefail
umask 077
app=${1:?}; revision=${2:?}; url=${3:?}; expected=${4:?}
[[ $revision =~ ^[a-f0-9]{40}$ && $expected =~ ^[a-f0-9]{64}$ ]] || exit 2
[[ $app == "$(cat /etc/merken-deploy-app)" ]] || exit 2
[[ $url == https://merken-cicd-354918393508-us-east-1.s3.us-east-1.amazonaws.com/* ]] || exit 2
exec 9>/var/lock/merken-deploy.lock
flock -w 180 9
case "$app" in
  frontend) directory=/docker/front-web; project=merken-frontend; service=dashboard; container=merken-frontend-dashboard-1; base=compose.yaml; image="merken-frontend:$revision"; health=http://127.0.0.1:3001/login ;;
  backend) directory=/home/ec2-user/backend; project=backend; service=backend; container=astronaut-backend; base=docker-compose.yml; image="astronaut-backend:$revision"; health=http://127.0.0.1:8080/healthz ;;
  *) exit 2 ;;
esac
test -f "$directory/$base"
release="$directory/deploy-releases/$(date -u +%Y%m%dT%H%M%SZ)-$revision"
mkdir -p "$release"
previous=$(docker inspect "$container" --format '{{.Config.Image}}')
previous_id=$(docker inspect "$container" --format '{{.Image}}')
rollback_image="merken-rollback-$app:$revision"
docker tag "$previous_id" "$rollback_image"
cp "$directory/$base" "$release/compose.before"
override="$directory/cicd-image.override.json"
if [[ -f $override ]]; then cp "$override" "$release/override.before"; fi
curl --fail --silent --show-error --retry 3 --max-time 600 "$url" -o "$release/image.tar.gz"
printf '%s  %s\n' "$expected" "$release/image.tar.gz" | sha256sum --check --status
gzip -dc "$release/image.tar.gz" | docker load > "$release/load.log"
docker image inspect "$image" >/dev/null
printf '{"services":{"%s":{"image":"%s"}}}\n' "$service" "$image" > "$override"
compose=(docker compose --project-name "$project" --project-directory "$directory" -f "$directory/$base" -f "$override")
if "${compose[@]}" up -d --no-build --pull never "$service" &&
   curl --fail --silent --show-error --retry 40 --retry-all-errors --retry-delay 3 --max-time 5 "$health" > /dev/null; then
  printf '%s\n' "$revision" > "$directory/cicd-current-revision"
  printf 'DEPLOY_OK app=%s revision=%s previous=%s\n' "$app" "$revision" "$previous"
  # Only remove this verified downloaded artifact; retain images and release metadata.
  rm -- "$release/image.tar.gz"
  exit 0
fi
printf 'Health check failed; restoring previous image.\n' >&2
printf '{"services":{"%s":{"image":"%s"}}}\n' "$service" "$rollback_image" > "$override"
"${compose[@]}" up -d --no-build --pull never "$service"
printf 'ROLLBACK_APPLIED app=%s image=%s\n' "$app" "$rollback_image" >&2
exit 1
