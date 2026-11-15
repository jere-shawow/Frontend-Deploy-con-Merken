# frontend CI/CD through AWS Systems Manager

Pull requests run CI only. Pushes to main and manual runs on main build and test
an ARM64 image, then deploy the same image using SSM. AWS credentials come from
GitHub OIDC; no SSH key, AWS access key or self-hosted runner is required.

The shared AWS role MerkenGitHubSSMDeploy trusts only main in the two Merken
repositories. Repository secrets: AWS_DEPLOY_ROLE_ARN, AWS_REGION,
SSM_INSTANCE_ID, DEPLOY_ARTIFACT_BUCKET. These identify infrastructure and are
not permanent credentials. Variable EC2_DEPLOY_ENABLED=true enables deployment.

Images are encrypted in a private S3 bucket and expire after seven days. The
host downloads with a temporary presigned URL, verifies SHA-256 and uses the
root-owned /usr/local/sbin/merken-deploy script via Merken-DeployArtifact v2.
This document is the only Run Command document authorized for the CI role.

The installed deployment script preserves the existing Compose file and runtime
environment, saves the previous image and applies only an image override. A
failed health check restores the previous image and marks the workflow failed.
No database migration rollback is implied. Runtime passwords and existing tokens
stay on the server and are never passed through GitHub or included in images.
No docker prune, volume deletion or changes to other services are performed.

Host script source: ssm-host.sh. Install updates deliberately as root after
review; changing this copy alone does not update the privileged host script.
Concurrent deployments are serialized by GitHub and a host lock. Image/release
cleanup is a separate manual task; monitor free disk space.

Frontend: /docker/front-web, project merken-frontend, service dashboard, port
127.0.0.1:3001, health /login. Backend: /home/ec2-user/backend, project backend,
service backend, existing port binding preserved, health /healthz.

The frontend EC2 role has only AmazonSSMManagedInstanceCore. The backend role
retains SSM and limited Amazon Nova Pro invocation. Bedrock is for the ground
backend; Android SLM inference remains offline.
