#!/bin/bash
# ==============================================================================
# Aurelinx Admin ID (Access Code) Management Script
# ==============================================================================

set -e

# Find directory where script resides
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Run the python management module inside the API container
docker compose -f "$DIR/docker-compose.prod.yml" exec api python -m app.core.manage_codes "$@"
