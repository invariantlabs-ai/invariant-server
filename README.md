# invariant-server

REST API Server made to run Invariant policies remotely.

## Installation

```bash
git clone https://github.com/invariantlabs-ai/invariant-server
cd invariant-server
docker build -t invariant-server .
docker run -e PRODUCTION=true --privileged -d -p8000:8000 invariant-server
```

The `--privileged` flag is required to run each session policy in its own [nsjail](https://nsjail.dev/). This is required to ensure isolation between multiple users running policies on the same server.

Note that `PRODUCTION=true` requires the `--privileged` flag.

If running ubuntu 23.10 or later, you need to run these commands on the host:
```
sudo sysctl -w kernel.apparmor_restrict_unprivileged_unconfined=0
sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
```

This is related to issue [#236](https://github.com/google/nsjail/issues/236).

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
rye sync
rye run uvicorn server.main:app --reload
```

## Components

- **session** - A session is an instance that belongs to one or more users. It is used to store and run policies, and setup monitors for the policies. In production mode, all sessions are isolated between eachother, however policies within the same session share the same environment.
- **policy** - An invariant policy, these can be used to store policies and you can use a specific policy to analyze traces.
- **monitor** - Setups a monitor which will run a policy on traces that are incrementally sent to the server. The monitor will only return new errors that were not previously detected. The monitors can either be instantiated from a policy or direct from text.
