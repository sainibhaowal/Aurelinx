#!/usr/bin/env python3
"""
Setup PostgreSQL database and seed with test data
"""

import subprocess
import os
import sys

# Add PostgreSQL bin to PATH
os.environ['Path'] += ";C:\\Program Files\\PostgreSQL\\18\\bin"

def run_psql(sql: str, user: str = "postgres", db: str = "postgres") -> bool:
    """Run a psql command"""
    try:
        cmd = f'psql -U {user} -d {db} -c "{sql}"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            print(f"❌ Error: {result.stderr}")
            return False
        if result.stdout:
            print(result.stdout)
        return True
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

def setup_database():
    """Create database and user"""
    print("🔧 Setting up PostgreSQL...")
    
    # Try connecting as postgres first (might not need password on local)
    print("\n1. Attempting to create aurelius_db...")
    run_psql("DROP DATABASE IF EXISTS aurelius_db;")
    if not run_psql("CREATE DATABASE aurelius_db;"):
        print("⚠️  Could not create database. Trying with password...")
        # Sometimes local connections work without password
        print("⚠️  Note: You may need to set postgres password in PostgreSQL")
        return False
    
    print("✅ Created aurelius_db")
    
    print("\n2. Attempting to create aurelius role...")
    run_psql("DROP ROLE IF EXISTS aurelius;")
    if not run_psql("CREATE ROLE aurelius WITH LOGIN PASSWORD 'aurelius_password';"):
        print("❌ Could not create role")
        return False
    
    print("✅ Created aurelius role")
    
    print("\n3. Granting privileges...")
    run_psql("ALTER ROLE aurelius CREATEDB;")
    
    # Connect as aurelius to verify
    print("\n4. Verifying connection as aurelius...")
    result = subprocess.run(
        'psql -U aurelius -d aurelius_db -c "SELECT 1;"',
        shell=True,
        capture_output=True,
        text=True,
        timeout=5
    )
    if result.returncode != 0:
        print(f"⚠️  Connection failed: {result.stderr}")
        print("\n💡 SOLUTION: You may need to set the postgres password in PostgreSQL")
        print("   On Windows, restart PostgreSQL with a known password")
        return False
    
    print("✅ aurelius user can connect")
    return True

if __name__ == "__main__":
    success = setup_database()
    if success:
        print("\n✅ Database setup complete! Now run:")
        print("   python -m app.core.seed_data")
    else:
        print("\n❌ Database setup needs attention. See notes above.")
        sys.exit(1)
