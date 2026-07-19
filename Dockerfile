# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e
ARG NODE_IMAGE=node:22.20.0-alpine3.22@sha256:dbcedd8aeab47fbc0f4dd4bffa55b7c3c729a707875968d467aaaea42d6225af
ARG GO_IMAGE=golang:1.26.5-alpine3.22@sha256:ea341baa9bd5ba6784f6d7161ace70544349a6242d54d34a0fbfd2c4d51c9d58
FROM ${NODE_IMAGE} AS web
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json vite.config.ts index.html ./
COPY vendor ./vendor
COPY src ./src
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate && pnpm install --frozen-lockfile
RUN pnpm build

FROM ${GO_IMAGE} AS build
ARG VERSION=dev
WORKDIR /src
COPY server ./
RUN --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" -o /out/static-web .

FROM scratch
ARG VERSION=dev
ARG REVISION=unknown
LABEL org.opencontainers.image.title="natadeCOCO GDK Reference" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.source="https://github.com/hakobune8/natade-coco-gdk"
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /out/static-web /app/static-web
COPY --from=web /src/dist /app/web
USER 65532:65532
EXPOSE 8080
ENV NATADECOCO_STATIC_ROOT=/app/web NATADECOCO_STATIC_PREFIX=/games/gdk-reference/
ENTRYPOINT ["/app/static-web"]
