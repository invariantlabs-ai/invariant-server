FROM node:20 as frontend-builder

WORKDIR /app

COPY ./playground/package*.json ./
RUN npm install

COPY ./playground/ ./
RUN npm run build

FROM gcr.io/kctf-docker/challenge

RUN useradd --create-home --shell /bin/bash app
RUN apt-get -y update && apt-get install -y git curl

RUN chmod u+s /usr/bin/nsjail

# install rye
RUN curl -sSf https://rye.astral.sh/get | RYE_HOME="/home/app/.rye" RYE_INSTALL_OPTION="--yes" RYE_TOOLCHAIN_VERSION="3.12.3" bash

USER app
WORKDIR /home/app

COPY --chown=app requirements.lock ./
COPY --chown=app pyproject.toml ./
COPY --chown=app .python-version ./
COPY --chown=app README.md ./

RUN /bin/bash -c 'source /home/app/.rye/env && rye sync'

ENV PATH="/home/app/.rye/shims:${PATH}"

RUN curl https://semgrep.dev/c/r/bash -s -o /tmp/bash
RUN curl https://semgrep.dev/c/r/python.lang.security -s -o /tmp/python.lang.security

COPY server ./server
COPY --from=frontend-builder /app/dist ./playground/dist

USER root
RUN chown -R app:app /home/app/server/logs

USER app

EXPOSE 8000

CMD ["rye", "run", "uvicorn", "server.main:app", "--host", "0.0.0.0"]