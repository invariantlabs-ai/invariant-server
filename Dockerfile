FROM gcr.io/kctf-docker/challenge

RUN useradd --create-home --shell /bin/bash app
RUN apt-get -y update && apt-get install -y git curl

# install rye
RUN curl -sSf https://rye.astral.sh/get | RYE_HOME="/home/app/.rye" RYE_INSTALL_OPTION="--yes" RYE_TOOLCHAIN_VERSION="3.12.3" bash

USER app
WORKDIR /home/app

COPY --chown=app requirements.lock ./
COPY --chown=app pyproject.toml ./
COPY --chown=app .python-version ./
COPY --chown=app README.md ./

RUN /bin/bash -c 'source /home/app/.rye/env && rye sync'

COPY server ./server

EXPOSE 8000

ENV PATH="/home/app/.rye/shims:${PATH}"

CMD ["rye", "run", "uvicorn", "server.main:app", "--host", "0.0.0.0"]