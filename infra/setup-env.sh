#!/bin/bash
# Exit on error
set -e

ENV_FILE=".env.production"
EXAMPLE_FILE=".env.production.example"

if [ -f "$ENV_FILE" ]; then
    echo "✓ $ENV_FILE already exists. Skipping generation."
    exit 0
fi

if [ ! -f "$EXAMPLE_FILE" ]; then
    echo "Error: $EXAMPLE_FILE not found!" >&2
    exit 1
fi

echo "Generating $ENV_FILE from template..."

# Generate secure random secrets
DB_PASS=$(openssl rand -hex 16)
REDIS_PASS=$(openssl rand -hex 16)
SECRET_KEY_GEN=$(openssl rand -hex 32)

# Copy template to production file
cp "$EXAMPLE_FILE" "$ENV_FILE"

# Replace placeholders with generated secrets
# Using sed (Linux compatible)
sed -i "s/AurelinxPg_2026\!ChangeMe/$DB_PASS/g" "$ENV_FILE"
sed -i "s/AurelinxRedis_2026\!ChangeMe/$REDIS_PASS/g" "$ENV_FILE"
sed -i "s/AurelinxSecretKey_2026_ChangeThisValue_BeforeInternetExposure/$SECRET_KEY_GEN/g" "$ENV_FILE"

# Ask user for URLs if running in interactive mode
if [ -t 0 ]; then
    echo ""
    read -p "Enter your site domain (e.g. https://aurelinx.averqel.com) [Press Enter for default http://localhost]: " SITE_ADDR
    if [ -n "$SITE_ADDR" ]; then
        # Remove trailing slash
        SITE_ADDR=${SITE_ADDR%/}
        sed -i "s|SITE_ADDRESS=http://localhost|SITE_ADDRESS=$SITE_ADDR|g" "$ENV_FILE"
        sed -i "s|NEXT_PUBLIC_API_URL=http://localhost:5100|NEXT_PUBLIC_API_URL=$SITE_ADDR|g" "$ENV_FILE"
        sed -i "s|FRONTEND_URL=http://localhost:3100|FRONTEND_URL=$SITE_ADDR|g" "$ENV_FILE"
        sed -i "s|ALLOWED_ORIGINS=http://localhost:3100|ALLOWED_ORIGINS=$SITE_ADDR|g" "$ENV_FILE"
        
        # Clean domain for ALLOWED_HOSTS (strip http/https and ports)
        CLEAN_DOMAIN=$(echo "$SITE_ADDR" | sed -e 's|^[^/]*//||' -e 's|:[0-9]*||')
        sed -i "s|ALLOWED_HOSTS=localhost,127.0.0.1,web,api|ALLOWED_HOSTS=$CLEAN_DOMAIN,localhost,127.0.0.1,web,api|g" "$ENV_FILE"
    fi
fi

echo "✓ $ENV_FILE generated successfully with secure random passwords!"
