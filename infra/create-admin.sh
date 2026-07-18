#!/bin/bash
# Exit on error
set -e

echo "========================================="
echo "   Aurelius Admin Account Creator"
echo "========================================="
echo ""

read -p "Enter Admin Email: " ADMIN_EMAIL
read -sp "Enter Admin Password: " ADMIN_PASSWORD
echo ""
read -p "Enter Admin Full Name (e.g. Admin): " ADMIN_NAME
echo ""

echo "Creating admin account inside docker..."

docker compose -f docker-compose.prod.yml exec -T api python -c "
import sys
from sqlmodel import Session
from app.models.database import engine, UserTable
from app.core.security import hash_password

email = '${ADMIN_EMAIL}'
password = '${ADMIN_PASSWORD}'
full_name = '${ADMIN_NAME}'

with Session(engine) as session:
    existing = session.query(UserTable).filter(UserTable.email == email).first()
    if existing:
        print(f'❌ User {email} already exists.')
        sys.exit(1)
    user = UserTable(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
        is_active=True,
        is_admin=True
    )
    session.add(user)
    session.commit()
    print(f'✅ Admin account created successfully for {email}!')
"
