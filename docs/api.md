# Invariant Server API Documentation

## Endpoints

### POST /api/policy/analyze

Analyzes a trace against a specified policy.

**Request Body:**
- `trace` (array): Sequence of messages with `role` and `content`.
- `policy` (string): Policy script defining evaluation conditions.

**Headers:**
- `Cache-Control` (optional): Set to `no-cache` to bypass caching and force a fresh analysis.

**Response:**
- Returns analysis result or error details.

### POST /api/monitor/check

Checks past and pending events against a policy.

**Request Body:**
- `past_events` (array): List of occurred events.
- `pending_events` (array): List of upcoming events.
- `policy` (string): Policy script for event evaluation.

**Headers:**
- `Cache-Control` (optional): Set to `no-cache` to bypass caching and force a fresh analysis.

**Response:**
- Returns check result or error details.

## Notes

- Both endpoints use caching for improved performance.
- Requests are logged for monitoring and debugging purposes.
- The server uses Prometheus for metrics and instrumentation.
- In production mode, policies run in isolated environments using nsjail.

For detailed usage examples, refer to the client.py file in the repository.
