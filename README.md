# invariant-server

API Server to run Invariant policies remotely.

## Installation

```bash
git clone https://github.com/invariantlabs-ai/invariant-server
cd invariant-server
docker build -t invariant-server .
docker run -e PRODUCTION=true --privileged -d -p8000:8000 invariant-server
```

The `--privileged` flag is required to run each session policy in its own [nsjail](https://nsjail.dev/). Note that `PRODUCTION=true` requires the `--privileged` flag.

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