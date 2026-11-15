"""Upload this run's image and deploy through SSM with short-lived OIDC credentials."""
import hashlib
import json
import os
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import urlparse

def aws(*args):
    p = subprocess.run(['aws', *args, '--region', os.environ['AWS_REGION'], '--no-cli-pager'], capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError(p.stderr)
    return p.stdout.strip()

app = os.environ['DEPLOY_APP']
revision = os.environ['GITHUB_SHA']
assert app in ('frontend', 'backend') and re.fullmatch(r'[a-f0-9]{40}', revision)
artifact = Path('image.tar.gz')
digest = hashlib.file_digest(artifact.open('rb'), 'sha256').hexdigest()
uri = f"s3://{os.environ['DEPLOY_ARTIFACT_BUCKET']}/releases/{app}/{revision}/{os.environ['GITHUB_RUN_ID']}-{os.environ['GITHUB_RUN_ATTEMPT']}.tar.gz"
aws('s3', 'cp', str(artifact), uri, '--only-show-errors', '--sse', 'AES256')
aws('configure', 'set', 'default.s3.signature_version', 's3v4')
url = aws('s3', 'presign', uri, '--expires-in', '3600')
assert urlparse(url).hostname == os.environ['DEPLOY_ARTIFACT_BUCKET'] + '.s3.us-east-1.amazonaws.com'
print('::add-mask::' + url, flush=True)
params = {'App': [app], 'Revision': [revision], 'Sha256': [digest], 'ArtifactUrl': [url]}
Path('ssm-parameters.json').write_text(json.dumps(params), encoding='utf-8')
command = aws('ssm', 'send-command', '--instance-ids', os.environ['SSM_INSTANCE_ID'], '--document-name', 'Merken-DeployArtifact', '--document-version', '2', '--parameters', 'file://ssm-parameters.json', '--timeout-seconds', '600', '--comment', f"GitHub {app} {revision}", '--query', 'Command.CommandId', '--output', 'text')
print('SSM command: ' + command, flush=True)
terminal = {'Success', 'Failed', 'Cancelled', 'TimedOut', 'Cancelling'}
for _ in range(180):
    time.sleep(10)
    try:
        result = json.loads(aws('ssm', 'get-command-invocation', '--command-id', command, '--instance-id', os.environ['SSM_INSTANCE_ID'], '--output', 'json'))
    except RuntimeError as error:
        if 'InvocationDoesNotExist' in str(error):
            continue
        raise
    if result['Status'] in terminal:
        print(result.get('StandardOutputContent', ''))
        print(result.get('StandardErrorContent', ''))
        if result['Status'] != 'Success':
            raise SystemExit('Deployment status: ' + result['Status'])
        break
else:
    raise SystemExit('SSM did not finish within 30 minutes; inspect command ' + command)
