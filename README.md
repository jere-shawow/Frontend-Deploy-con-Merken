# Orbit Crew Health

## DynamoDB backend local

Para `../merken-api`, usa `MERKEN_TELEMETRY_URL=http://127.0.0.1:4000` en
`.env.local`. `/api/dashboard` consulta el roster y las mediciones paginadas de
Merken. El servicio anterior `/api/astronauts` se mantiene para el directorio.
Las credenciales AWS pertenecen solamente al backend.

Specialist incluye JSON reports: guarda el snapshot visible en el servidor,
descarga JSON y permite reintentar subidas. El backend guarda primero en
`data/reports/`. Para subir informes completos requiere la tabla separada
`merken_reports`, con `astronaut_id` (S) y `report_id` (S), y la variable
`DYNAMO_TABLE_REPORTS=merken_reports`. Mientras no exista o AWS falle, los
informes permanecen locales y pendientes. No se mezclan con `health_records`.
El historial local necesita almacenamiento persistente; los reintentos son manuales.
Consulta el README del backend para el template, permisos y límites.

Next.js dashboard for astronaut telemetry. The app starts with synthetic demo data.

## Local development on Windows

Use Node.js 24. Open CMD in this directory and run:

```cmd
npm ci
npm run dev -- --port 3001
```

Open http://localhost:3001. Select a crew member, select a metric, and filter alerts by severity. Press Ctrl+C to stop the server.


## Backend handoff

Set `DASHBOARD_BACKEND_URL` in `.env.local` for Next.js development or in the server environment. It must point to the backend's full dashboard GET URL. Next.js fetches it server-side through `/api/dashboard`. A configured backend failure appears in the UI. Demo mode is available when the URL is unset.

Use the object in `lib/demo.js` as the response example. The backend returns `{ "crew": [...] }`. Each crew member has `id`, `name`, `role`, `initials`, `metrics`, and `alerts` arrays. Metric entries are `[id, label, currentValue, unit, numericReadingsOldestFirst]`. Alerts include `level` (critical, warning, or suggestion), `title`, `detail`, `recommendation`, and `time`. Return empty arrays when the respective data is unavailable.

Garmin ingestion, anomaly detection, and Amazon Nova inference through Amazon Bedrock belong to the team's backend. Return reviewed alert text and recommendations in the same response. The frontend requires zero AWS credentials. Demo alerts are illustrative.

## Future EC2 deployment

The Dockerfile and Compose file are for this stage. From the project directory on the EC2 instance, run `sudo docker compose up --build -d`. Compose builds the image for the host architecture, including ARM64. On EC2, add the dashboard service to the backend's Docker network and set the URL to the backend service name and container port. To join an existing network, declare it as external in a Compose override and attach the dashboard service to it. Keep host port 3001 for this app if Grafana already uses 3000. Use an SSH tunnel or an authenticated reverse proxy to access the app.
The optional crew-level `metricStatuses` object maps metric IDs to `normal`, `warning`, or `critical`. The body map shows `Not assessed` when a metric or its assessment is unavailable. Demo statuses are illustrative; live statuses must come from the backend.

Crew profiles accept optional numeric `weightKg` and `heightCm`. Stress is read from the `stress` metric. The demo runs a four-stage telemetry simulation every six seconds; use Pause or Next scenario to inspect changes.

## Specialist workspace

Choose Specialist in the navigation, then select a crew member to see all available telemetry readings, summary statistics and alerts. Use Create crew review to record an assessment and a follow-up. Each review snapshots the currently displayed telemetry and alerts.

This prototype stores reviews per crew member and data source in browser local storage. They are specific to the browser profile and site origin. Shared specialist accounts, access control, and server-side review storage require backend integration.


## Dashboard navigation

Overview shows crew averages and recommendations. Astronauts shows individual telemetry and alerts. Specialist shows detailed readings and review creation.

The Overview includes stress, sleep and space radiation trends for the selected crew member. Radiation uses the optional `radiation` metric. Demo radiation is synthetic. Without backend readings the dashboard shows No reading.

## Merken v0.3 review persistence

Set the server-only `MERKEN_API_URL` to the Merken HTTPS origin. In backend mode, use an individual ground reviewer access token in Specialist. The token stays in page memory and is sent to Merken through the Next.js API. Host the dashboard over HTTPS for shared access.

The proposed Merken extension uses a dedicated DynamoDB table, `merken_specialist_reviews`. See `infrastructure/specialist-reviews.yaml` for the CloudFormation template. The partition key is `astronaut_id` and the sort key is `review_id`. Each immutable review stores `summary` (the specialist's comment), `attention_level`, `recommendations`, and optional linked records in `about.record_ids`. Merken assigns `review_id`, `created_by`, `created_at`, `received_at`, `schema_version` and `seq`.

The backend must implement both methods on `/v1/astronauts/{astronaut_id}/specialist-reviews` for `ground_reviewer`:

- POST accepts the fields above that come from the form, verifies that all references belong to this astronaut, and requires `Idempotency-Key`. Use the §4 UUIDv5 and conditional transaction with the new table and a `specialist_review` journal entry. Extend the change-entity enum and coordinate with sync consumers before publishing the new entity. Return 201 for a new insert, 200 for an identical retry, and 409 for a conflicting payload.
- GET queries the astronaut partition and accepts `limit` and an optional opaque `cursor` bound to the astronaut ID. Return `{"reviews":[{"review_id":"…","seq":1,"created_at":"…","summary":"…","attention_level":"routine","recommendations":[],"about":{"record_ids":[]}}],"next_cursor":null}`. Continue DynamoDB pagination until the query is exhausted. The UI orders loaded reviews by descending sequence.

Deploy the table in the same AWS environment as Merken and grant the backend role access. This repository contains the infrastructure template and frontend integration. The API methods and transactional write belong to the Merken backend. Existing `merken_analyses` entries remain in that table.


Send each crew member's Merken UUID as `astronaut_id` or `id`. To attach an exact reading, supply an optional sixth metric tuple entry containing the Merken `record_id` array aligned with the numeric sample array. The backend verifies the record belongs to the astronaut. Demo-only reviews remain in browser local storage.


## Merken telemetry feed

Set server-only `MERKEN_TELEMETRY_URL` and `MERKEN_TELEMETRY_TOKEN` in `.env.local` for local Next.js development, or in the Compose environment. This mode fetches the roster and paginated record history from Merken without running the frontend demo simulation. Use HTTPS for a shared or production API. This read feed is separate from the Merken review API.

See [EC2 deployment](deploy/README.md) for CI/CD setup and network rules.
