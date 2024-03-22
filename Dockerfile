# Node Modules
FROM node:18 as nodemodules

WORKDIR /stuff

COPY package*.json /stuff/

RUN npm ci


# Lint
FROM node:18 as lint

RUN apt-get update
RUN apt-get install -y \
    python3-pip \
    git

RUN pip3 install pre-commit --break-system-packages
RUN pip3 install xmlformatter --break-system-packages

WORKDIR /app

COPY . /app

RUN git config --global http.sslverify false

COPY --from=nodemodules /stuff/node_modules/ /app/node_modules

RUN pre-commit run --all-files


# Build
FROM node:18 as build

WORKDIR /app

COPY . /app

COPY --from=nodemodules /stuff/node_modules/ /app/node_modules

RUN npx prisma generate

RUN npm run build-prod


# Runtime
FROM node:18 as runtime

WORKDIR /app

COPY . /app
COPY entrypoint.sh /entrypoint.sh
COPY --from=build /app/dist/ /app/dist
COPY --from=nodemodules /stuff/node_modules/ /app/node_modules

RUN mkdir /data

RUN npx prisma generate

#dummy copy to ensure lint phase happens
COPY --from=lint /app/README.md /README.md

EXPOSE 7009

ENTRYPOINT ["/entrypoint.sh"]
