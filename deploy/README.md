# CI/CD to clawbot through SSH

Pull requests run tests and build a Linux AMD64 image. Main builds and tests the
same image, stores it as a short-lived GitHub artifact and streams it over SSH to
clawbot. The workflow no longer invokes AWS SSM, S3 or an AWS deployment role.
AWS services remain running independently; deployment never changes their data.

Repository variable: `CLAWBOT_DEPLOY_ENABLED=true`.
Secrets: `CLAWBOT_HOST`, `CLAWBOT_PORT`, `CLAWBOT_USER`,
`CLAWBOT_SSH_PRIVATE_KEY`, `CLAWBOT_KNOWN_HOSTS`.
The same dedicated key is used by the two repositories. The host public key is
pinned from a previously verified SSH session; host-key checking is mandatory.
No runtime application, database or AWS Bedrock credentials are sent to GitHub.

The `pulsys-deploy` account has no Docker group membership or unrestricted sudo.
Its authorized key forces a root-owned entry point which accepts only `check`
or `deploy frontend|backend <commit> <checksum>`. It denies interactive shells,
PTYs, forwarding and arbitrary commands. The host validates the checksum, image
tag and AMD64 platform before updating the requested service.

Destination: `/docker/pulsys/compose.yaml`, project `pulsys`, service `frontend`
or `backend`. Only that service is recreated with `--no-deps --no-build --pull
never`. Private environment files, bind mounts, memory limits, databases and
other services remain in place. A host-wide lock serializes both repositories.
Health-check failure restores the prior Compose image. Database schema changes
are not rolled back; future migrations require separate review and backup.

Previous Compose files and images are retained in `/docker/pulsys/deploy-releases`.
No pruning, volume deletion, DNS changes or public web port changes are performed.
Monitor disk space; deployment fails below 6 GiB rather than removing data.
The frontend remains on loopback port 23000; backend on 23080.

`clawbot_host.py` is the reviewed source for `/usr/local/sbin/pulsys-deploy`.
It is installed deliberately as root; editing this repository copy does not
replace the privileged host script automatically. `ssh_deploy.py` runs on CI.
Legacy SSM scripts are retained for reference but no workflow invokes them.

GitHub secret handling: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
