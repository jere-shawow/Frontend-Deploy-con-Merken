# Merken Mission Control

Next.js dashboard for astronaut telemetry. Production uses the configured astronaut backend; development without a backend uses synthetic demo data.

## Local development on Windows

Use Node.js 24. Open CMD in this directory and run:

```cmd
npm ci
npm run dev -- --port 3001
```

Set `ORBIT_DEMO_PASSWORD` and a random `ORBIT_DEMO_SESSION_SECRET` in `.env.local`, then open http://localhost:3001. Sign in as `demo` with the configured password. Authentication uses the signed HTTP-only session cookie and protects both dashboard routes and APIs. Press Ctrl+C to stop the server.


## Backend handoff

Set `MERKEN_ASTRONAUTS_URL` to the backend origin in `.env.local` or the server environment. Next.js fetches `/api/astronauts` server-side and maps astronaut fields to dashboard metrics. A configured backend failure appears in the UI. Without a configured backend, only development returns demo data; production returns an explicit configuration error.

The internal `/api/dashboard` response is `{ "source": "backend", "crew": [...] }`. Each crew member has `id`, `name`, `initials`, `metrics`, and `alerts`. Metric entries are `[id, label, currentValue, unit, numericReadingsOldestFirst, recordIds?, measuredAtTimestamps?]`. The current astronaut adapter supplies current values without historical readings or alerts. Those remain empty until the upstream integration provides them. Demo examples are in `lib/demo.js`. Alert events use `level` (critical, warning, or suggestion), `title`, `detail`, `recommendation`, `time` and preferably a stable `id` for dismissal.

Garmin ingestion, anomaly detection, and Amazon Nova inference through Amazon Bedrock belong to the team's backend. Return reviewed alert text and recommendations in the same response. The frontend requires zero AWS credentials. Demo alerts are illustrative.

## EC2 deployment

Deploy through `.github/workflows/frontend.yml`: pushes to `main` build and smoke-test the ARM64 Docker image, then deploy that tested image through AWS SSM with GitHub OIDC when `EC2_DEPLOY_ENABLED=true`. See `deploy/README.md` for configuration and rollback. Preserve the existing host Compose file and runtime environment. Production uses container port 3000 and loopback host port 3001.
The optional crew-level `metricStatuses` object maps metric IDs to `normal`, `warning`, or `critical`. The body map shows `Not assessed` when a metric or its assessment is unavailable. Demo statuses are illustrative; live statuses must come from the backend.

Crew profiles accept optional numeric `weightKg` and `heightCm`. Stress is read from the `stress` metric. The demo advances its telemetry simulation every six seconds. Use Pause or Next scenario to try the falling heart rate alert.

The dashboard refreshes telemetry once a minute while open. Notifications aggregates upstream alerts by astronaut, with priority filters and per-alert dismissal. Operator-created advisories and dismissals are stored in the current browser; they are not delivered to the mobile app. To try a local notification, choose New advisory and select a crew member.

Chart windows count readings: Last 7 readings, Last 14 readings or All readings. When matching measurement timestamps are available, the chart also shows the actual elapsed minutes, hours or days and the UTC endpoints. Without timestamps, it explicitly reports that a time interval is unavailable. The horizontal axis is the reading sequence, not elapsed time.

The dashboard adapts to desktop, tablet and phone widths, with horizontal navigation on small screens and scrolling confined to detailed telemetry tables. Validate the reading-window logic with `node --test lib/reading-window.test.mjs` and the production build with `npm run build`.

Records saves one automatic snapshot per astronaut and UTC day while the dashboard is open. Generate record saves an additional manual snapshot. Metrics with sample timestamps include today's readings. Metrics without timestamps show the latest available value. Records are stored in the current browser, scoped to the telemetry source and astronaut.

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
