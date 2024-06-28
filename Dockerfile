FROM gcr.io/kctf-docker/challenge

RUN groupadd -r app && useradd -r -g app app
RUN apt-get -y update && apt-get install -y git curl

WORKDIR /app

# install rye
RUN curl -sSf https://rye.astral.sh/get | RYE_HOME="/home/app/.rye" RYE_INSTALL_OPTION="--yes" RYE_TOOLCHAIN_VERSION="3.12.3" bash

COPY requirements.lock ./
COPY pyproject.toml ./
COPY .python-version ./
COPY README.md ./

RUN /bin/bash -c 'source /home/app/.rye/env && rye sync'

COPY server ./server

RUN chown -R app:app /app && chmod -R 750 /app

EXPOSE 8000

USER app

CMD ["/home/app/.rye/shims/rye", "run", "uvicorn", "server.main:app", "--host", "0.0.0.0"]