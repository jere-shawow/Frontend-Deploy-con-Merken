#!/usr/bin/python3
"""Root-owned deployment gate. Never install a repository copy automatically."""
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import time
import urllib.error
import urllib.request

ROOT = Path('/docker/pulsys')
APPS = {'frontend': ('merken-frontend', 23000, '/login'),
        'backend': ('astronaut-backend', 23080, '/healthz')}
MAX_ARCHIVE_BYTES = 2 * 1024**3

def command(text):
    if text == 'check':
        return None
    match = re.fullmatch(r'deploy (frontend|backend) ([0-9a-f]{40}) ([0-9a-f]{64})', text)
    if not match:
        raise ValueError('Only check or deploy <service> <commit> <checksum> is supported')
    return match.groups()

def validate_archive(path, expected_tag):
    # Docker-save archives are inspected without extracting any files.
    with tarfile.open(path, 'r:gz') as archive:
        manifests = [m for m in archive.getmembers() if m.name == 'manifest.json']
        if len(manifests) != 1 or manifests[0].size > 1024 * 1024:
            raise ValueError('Missing or oversized Docker image manifest')
        manifest = json.load(archive.extractfile(manifests[0]))
        if len(manifest) != 1 or manifest[0].get('RepoTags') != [expected_tag]:
            raise ValueError('Image archive must contain only the requested application tag')
        # Avoid conflicting legacy image naming metadata.
        if any(m.name == 'repositories' for m in archive.getmembers()):
            stream = archive.extractfile('repositories')
            repositories = json.load(stream)
            name, tag = expected_tag.rsplit(':', 1)
            if set(repositories) != {name} or set(repositories[name]) != {tag}:
                raise ValueError('Unexpected legacy image tags')

def docker(*args, timeout=300):
    result = subprocess.run(['docker', *args], capture_output=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError('Docker operation failed: ' + args[0])
    return result.stdout

def save_json(path, value):
    pending = path.with_name(path.name + '.pending')
    with pending.open('w') as stream:
        os.chmod(pending, 0o600)
        json.dump(value, stream, indent=2)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(pending, path)

def response_status(url):
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    opener = urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(url, timeout=5) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code

def healthy(app):
    _, port, path = APPS[app]
    base = 'http://127.0.0.1:' + str(port)
    if response_status(base + path) != 200:
        return False
    if app == 'frontend':
        return response_status(base + '/api/dashboard') == 401 and response_status(base + '/') == 307
    return True

def wait_healthy(app):
    for _ in range(70):
        try:
            if healthy(app):
                return
        except (OSError, TimeoutError):
            pass
        time.sleep(2)
    raise RuntimeError('Application health check failed')

def deploy(app, sha, checksum):
    root = ROOT
    releases = root / 'deploy-releases'
    releases.mkdir(mode=0o700, exist_ok=True)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    release = releases / (stamp + '-' + app + '-' + sha[:12])
    release.mkdir(mode=0o700)
    archive = release / 'image.tar.gz'
    if shutil.disk_usage(root).free < 6 * 1024**3:
        raise RuntimeError('Less than 6 GiB disk space available; no data will be pruned')
    digest = hashlib.sha256()
    total = 0
    with archive.open('xb') as output:
        os.chmod(archive, 0o600)
        while chunk := sys.stdin.buffer.read(1024 * 1024):
            total += len(chunk)
            if total > MAX_ARCHIVE_BYTES:
                raise ValueError('Deployment archive exceeds size limit')
            output.write(chunk)
            digest.update(chunk)
    if digest.hexdigest() != checksum:
        raise ValueError('Image checksum mismatch')
    expected_tag = APPS[app][0] + ':' + sha
    validate_archive(archive, expected_tag)
    docker('load', '--input', str(archive), timeout=600)
    platform = docker('image', 'inspect', '--format', '{{.Os}}/{{.Architecture}}', expected_tag).decode().strip()
    if platform != 'linux/amd64':
        raise ValueError('Clawbot requires a linux/amd64 image')
    compose_file = root / 'compose.yaml'
    original = json.loads(compose_file.read_text())
    previous_image = original['services'][app]['image']
    save_json(release / 'compose.before.json', original)
    updated = json.loads(json.dumps(original))
    updated['services'][app]['image'] = expected_tag
    save_json(compose_file, updated)
    compose = ['compose', '-p', 'pulsys', '-f', str(compose_file)]
    try:
        docker(*compose, 'up', '-d', '--no-deps', '--no-build', '--pull', 'never', app)
        wait_healthy(app)
        container = json.loads(docker('inspect', 'pulsys-' + app + '-1'))[0]
        if not container['State']['Running'] or container['State']['OOMKilled']:
            raise RuntimeError('Application is not running normally')
        report = {'service': app, 'commit': sha, 'image': expected_tag,
                  'previousImage': previous_image, 'checksum': checksum, 'status': 'healthy'}
        save_json(release / 'result.json', report)
        save_json(root / 'reports' / (app + '-deployment.json'), report)
        print(json.dumps(report), flush=True)
    except Exception:
        save_json(compose_file, original)
        docker(*compose, 'up', '-d', '--no-deps', '--no-build', '--pull', 'never', app)
        wait_healthy(app)
        save_json(release / 'result.json', {'service': app, 'commit': sha, 'status': 'rolled_back'})
        raise RuntimeError('Deployment failed; previous image was restored') from None

def main():
    os.umask(0o077)
    if os.geteuid() != 0 or len(sys.argv) != 2:
        raise ValueError('Use the restricted SSH deployment entry point')
    parsed = command(sys.argv[1])
    if parsed is None:
        print(json.dumps({'service': 'pulsys-deploy', 'applications': list(APPS), 'platform': 'linux/amd64'}))
        return
    with (ROOT / '.deployment.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        deploy(*parsed)

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
