#!/bin/sh
set -eu

environment="$1"
channel="$2"
shift 2

if [ "$#" -eq 0 ]; then
  echo "Usage: yarn update:$channel \"message de mise a jour\"" >&2
  exit 2
fi

if [ -z "${SENTRY_AUTH_TOKEN:-}" ] && command -v security >/dev/null 2>&1; then
  SENTRY_AUTH_TOKEN="$(security find-generic-password \
    -s codex-sentry-ci-hadjadji-mohamed \
    -a source-map-upload \
    -w)"
  export SENTRY_AUTH_TOKEN
fi

if [ -z "${SENTRY_AUTH_TOKEN:-}" ]; then
  echo "SENTRY_AUTH_TOKEN est requis pour envoyer les source maps." >&2
  exit 1
fi

eas update \
  --channel "$channel" \
  --environment "$environment" \
  --message "$*"

npx sentry-expo-upload-sourcemaps dist
