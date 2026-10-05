# Frontend deployment

Set `NEXT_PUBLIC_API_BASE` in the Amplify build environment to the actual public
HTTPS API base, including the `/api` suffix. For example,
`https://api.example.com/api` illustrates the format; it is not a working backend.
Then rebuild and redeploy the frontend. Next.js embeds `NEXT_PUBLIC_*` variables
in browser JavaScript at build time, so changing a runtime variable alone does
not update an existing deployment.

The production build rejects an explicitly configured HTTP or loopback address.
Without a URL, the build succeeds and the site displays a data-service connection
message without sending any API requests. This is not a working data connection.
An unconfigured development server still uses `http://localhost:8000/api`.
Do not put database credentials or AWS keys in public frontend variables.

## API compatibility

The current UI consumes the legacy Django contract in `lib/api.js`: `/stats/`,
`/holes/`, hole measurements, trays, nearby holes, traces, and `/distance/`.
The FastAPI service in `../backend` instead exposes the dataset-based `/v1`
contract documented in `../backend/docs/FRONTEND_API.md`. Its `/api/holes` shape
also differs from the UI's expected shape. Pointing this frontend at that
service alone does not integrate the two APIs.

Confirm which service is deployed before choosing the URL. Connecting FastAPI
requires an explicit frontend adapter for dataset revision, sample axis, log
selection, pagination, and missing-data states. Preserve source identities and
do not fabricate mineral, confidence, or survey values to fill schema gaps.

## Verify a deployment

1. Build from `frontend` with the real `NEXT_PUBLIC_API_BASE` present.
2. In the browser Network panel, confirm requests go to that HTTPS host and
   receive JSON; no request should target localhost.
3. Confirm the backend permits the Amplify site's origin through CORS.
4. Verify hole search, details, comparison, and 3D against real backend data.

Run the configuration and API client tests with `npm test`.

## Basemap

Streets uses OpenStreetMap standard raster tiles with visible attribution.
Keep normal browser caching and referrer headers; do not add bulk download or
offline prefetch features. The community service has no availability guarantee.
For higher traffic, configure an appropriate tile provider in `config.js`.
See the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
