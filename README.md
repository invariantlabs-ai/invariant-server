# invariant-server

REST API Server made to run Invariant policies remotely.

## Installation

```bash
git clone https://github.com/invariantlabs-ai/invariant-server
cd invariant-server
cp .env.example .env
docker-compose up -d --build
```

## Environment Variables

- `PRODUCTION`: Set to `true` to run in production mode with nsjail isolation.
- `PROMETHEUS_TOKEN`: Token for authenticating Prometheus scrape requests.

## Production

The `docker-compose.yml` file is configured to run the container with the necessary privileges and settings for production use, including nsjail isolation.

Note that `PRODUCTION=true` requires privileged mode, which is already set in the docker-compose file. **Disable** privileges if not running in production mode.

If running ubuntu 23.10 or later, you need to run these commands on the host:
```
sudo sysctl -w kernel.apparmor_restrict_unprivileged_unconfined=0
sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
```

This is related to issue [#236](https://github.com/google/nsjail/issues/236).

## Staging

The application can also be run in development mode by omitting the `PRODUCTION` environment variable:

```bash
docker run -d -p8000:8000 invariant-server
```

The policies will be run in the same container and with the same permissions as the web application. Intended only for **development**.

## Usage

Check out [client.py](client.py) for an example of how to interact with the API.

Since the server is a REST API, you can use any HTTP client to interact with it, in any programming language.

Swagger UI documentation is available at `/docs` endpoint.

## Development

This project uses [rye](https://rye.astral.sh/), setting it up is as simple as:

```bash
git clone https://github.com/invariantlabs-ai/invariant-server
cd invariant-server

# start backend
rye sync
rye run uvicorn server.main:app --reload

# start frontend
cd playground
npm run dev
```

## API

### `POST /api/policy/analyze`

**Description:**  
This endpoint analyzes a given trace of messages against a specified policy to detect violations or specific conditions. It evaluates the content provided in the trace using the rules defined in the policy script.

**Request:**
- **Content-Type:** `application/json`
- **Body:**
  - `trace` (array): A sequence of messages where each message includes a `role` (e.g., `assistant`) and `content` (the actual text content).
  - `policy` (string): A policy script that defines the conditions to be evaluated on the trace.

**Example:**
```json
{
  "trace": [
    {"role": "assistant", "content": "/**\n* GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007\n*/\nexport const someConst = false;"}
  ],
  "policy": "from invariant.detectors import copyright\n\nraise \"found copyrighted code\" if:\n    (msg: Message)\n    not empty(copyright(msg.content, threshold=0.75))"
}
```

### `POST /api/monitor/check`

**Description:**  
This endpoint checks past and pending events against a policy to identify vulnerabilities or issues. It uses the policy script to examine the content of the events and raises alerts based on the conditions defined in the policy.

**Request:**
- **Content-Type:** `application/json`
- **Body:**
  - `past_events` (array): A list of events that have already occurred, where each event includes a `role` (e.g., `user`) and `content` (the text content).
  - `pending_events` (array): A list of upcoming or pending events with the same structure as `past_events`.
  - `policy` (string): A policy script that checks the events for specific patterns or issues.

**Example:**
```json
{
  "past_events": [
    {"role": "user", "content": "Hello, world!"}
  ],
  "pending_events": [
    {"role": "assistant", "content": "Hello, user 1"}
  ],
  "policy": "from invariant.detectors import semgrep, secrets, CodeIssue\n\nraise \"Vulnerability in python code [risk=medium]\" if:\n    (call: ToolCall)\n    call is tool:ipython_run_cell\n    semgrep_res := semgrep(call.function.arguments.code, lang=\"python\")\n    any(semgrep_res)\n\nraise \"Vulnerability in bash command [risk=medium]\" if:\n    (call: ToolCall)\n    call is tool:cmd_run\n    semgrep_res := semgrep(call.function.arguments.command, lang=\"bash\")\n    any(semgrep_res)"
}
```