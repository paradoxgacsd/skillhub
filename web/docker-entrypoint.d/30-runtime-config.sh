#!/bin/sh
set -eu

export SKILLHUB_WEB_API_BASE_URL="${SKILLHUB_WEB_API_BASE_URL:-/skillhub}"
export SKILLHUB_PUBLIC_BASE_URL="${SKILLHUB_PUBLIC_BASE_URL:-/skillhub}"
export SKILLHUB_REGISTRY_URL="${SKILLHUB_REGISTRY_URL:-}"
export SKILLHUB_WEB_AUTH_DIRECT_ENABLED="${SKILLHUB_WEB_AUTH_DIRECT_ENABLED:-false}"
export SKILLHUB_WEB_AUTH_DIRECT_PROVIDER="${SKILLHUB_WEB_AUTH_DIRECT_PROVIDER:-}"

# Session-bootstrap variables are defaulted here so envsubst writes
# `authSessionBootstrapEnabled: "false"` into runtime-config.js instead of leaving
# the literal `${...}` placeholder. They are intentionally NOT exposed in
# compose.release.yml or .env.release.example: the matching server-side switch
# does not exist yet, so surfacing the toggle would let the frontend hit
# /api/v1/auth/session/bootstrap and receive 403. See PR #280 discussion.
export SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_ENABLED="${SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_ENABLED:-false}"
export SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_PROVIDER="${SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_PROVIDER:-}"
export SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_AUTO="${SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_AUTO:-false}"

if [ -z "${SKILLHUB_REGISTRY_URL}" ]; then
  SKILLHUB_REGISTRY_URL="${SKILLHUB_PUBLIC_BASE_URL%/}"
  export SKILLHUB_REGISTRY_URL
fi

# Generate runtime-config.js
envsubst '${SKILLHUB_WEB_API_BASE_URL} ${SKILLHUB_PUBLIC_BASE_URL} ${SKILLHUB_WEB_AUTH_DIRECT_ENABLED} ${SKILLHUB_WEB_AUTH_DIRECT_PROVIDER} ${SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_ENABLED} ${SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_PROVIDER} ${SKILLHUB_WEB_AUTH_SESSION_BOOTSTRAP_AUTO}' \
  < /usr/share/nginx/html/skillhub/runtime-config.js.template \
  > /usr/share/nginx/html/skillhub/runtime-config.js

# Generate registry/skill.md with actual public URL
envsubst '${SKILLHUB_PUBLIC_BASE_URL} ${SKILLHUB_REGISTRY_URL}' \
  < /usr/share/nginx/html/skillhub/registry/skill.md.template \
  > /usr/share/nginx/html/skillhub/registry/skill.md
