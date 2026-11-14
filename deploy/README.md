# EC2 deployment

GitHub Actions builds an ARM64 Docker image and checks the home page on pull requests and pushes to main. On main, the EC2 runner downloads the tested image, tags it with the commit SHA, and replaces only the frontend container. A failed HTTP check rolls back to the previous local image when available.

## One-time setup

1. On the ARM64 EC2, install Docker Engine and Compose. Create the shared network with `sudo docker network create merken` if it does not exist. Attach the backend service to that external network via its Compose file and agree on its service name and internal port.
2. Create `/docker/front-web` and grant the deployment runner account write access. The pipeline copies its Compose file to that directory. Create `/docker/front-web/runtime.env` with mode 600, owned by the deployment runner account. Configure `MERKEN_TELEMETRY_URL=http://merken-backend:8001` using the actual service name and port, and set `MERKEN_TELEMETRY_TOKEN`. Set `MERKEN_API_URL` to the HTTPS origin for specialist reviews once available. With a local reverse proxy, keep the backend network private. The telemetry token is loaded only at runtime.
3. Register a repository-scoped Linux ARM64 self-hosted runner on EC2 with the custom label `merken-frontend` and install it as a service. The runner account needs access to Docker. Docker access grants host-level privileges. Use a dedicated account and restrict trusted changes to main. Pull request jobs run only on GitHub-hosted infrastructure.
4. Create the GitHub Actions environment `production`, restrict deployments to main, and set repository variable `EC2_DEPLOY_ENABLED=true`. Run the workflow from main or push a change. The first deployment checks HTTP availability. Use the dashboard to verify live backend data separately.

## Network

- Keep frontend port 3001 bound to loopback. Container port 3000 and backend port 8001 are internal. The runner uses outbound HTTPS 443 to GitHub and requires no inbound port for CI/CD.
- For browser access, place an authenticated HTTPS reverse proxy in front of `127.0.0.1:3001`. Allow inbound TCP 443 from the intended client ranges. Allow TCP 80 only if the chosen proxy uses an HTTP redirect or HTTP certificate challenge.
- For private access via an SSH tunnel, allow TCP 22 only from the administrators' IP ranges and forward 3001. Avoid exposing 3000, 3001, 8001, or database ports in the EC2 security group.
