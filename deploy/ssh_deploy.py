"""Stream the tested image over authenticated SSH; never print credentials."""
import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile

def main():
    app = os.environ['DEPLOY_APP']
    sha = os.environ['GITHUB_SHA']
    host = os.environ['CLAWBOT_HOST']
    port = os.environ['CLAWBOT_PORT']
    user = os.environ['CLAWBOT_USER']
    if app not in ('frontend', 'backend') or not re.fullmatch('[0-9a-f]{40}', sha):
        raise ValueError('Invalid deployment service or commit')
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9.-]*', host) or not port.isdigit() or not 0 < int(port) < 65536:
        raise ValueError('Invalid SSH endpoint')
    if user != 'pulsys-deploy':
        raise ValueError('Use the restricted deployment user')
    archive = Path('image.tar.gz')
    with archive.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    with tempfile.TemporaryDirectory(prefix='pulsys-ssh-') as folder:
        private = Path(folder) / 'identity'
        known = Path(folder) / 'known_hosts'
        for path, content in [(private, os.environ['CLAWBOT_SSH_PRIVATE_KEY']),
                              (known, os.environ['CLAWBOT_KNOWN_HOSTS'])]:
            path.write_text(content.rstrip() + '\n', encoding='utf-8')
            path.chmod(0o600)
        args = ['ssh', '-T', '-i', str(private), '-p', port,
                '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes',
                '-o', 'StrictHostKeyChecking=yes', '-o', 'UserKnownHostsFile=' + str(known),
                '-o', 'ConnectTimeout=20', '-o', 'ServerAliveInterval=15',
                '-o', 'ServerAliveCountMax=4', user + '@' + host,
                'deploy ' + app + ' ' + sha + ' ' + digest]
        with archive.open('rb') as stream:
            subprocess.run(args, stdin=stream, check=True, timeout=1800)

if __name__ == '__main__':
    main()
