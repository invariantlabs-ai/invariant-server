#!/bin/sh

git pull
docker build . -t invariant-server
docker rm -f invariant-server
source .env.local
docker run -d -e PRODUCTION=true -e PROMETHEUS_TOKEN=$PROMETHEUS_TOKEN --privileged --cgroupns=host -v ./server/logs:/home/app/server/logs -it -p8000:8000 --platform=linux/amd64 --name invariant-server invariant-server