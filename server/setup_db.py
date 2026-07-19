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
    print("\n1. Attempting to create aurelinx_db...")
    run_psql("DROP DATABASE IF EXISTS aurelinx_db;")
    if not run_psql("CREATE DATABASE aurelinx_db;"):
        print("⚠️  Could not create database. Trying with password...")
        # Sometimes local connections work without password
        print("⚠️  Note: You may need to set postgres password in PostgreSQL")
        return False
    
    print("✅ Created aurelinx_db")
    
    print("\n2. Attempting to create aurelinx role...")
    run_psql("DROP ROLE IF EXISTS aurelinx;")
    if not run_psql("CREATE ROLE aurelinx WITH LOGIN PASSWORD 'aurelinx_password';"):
        print("❌ Could not create role")
        return False
    
    print("✅ Created aurelinx role")
    
    print("\n3. Granting privileges...")
    run_psql("ALTER ROLE aurelinx CREATEDB;")
    
    # Connect as aurelinx to verify
    print("\n4. Verifying connection as aurelinx...")
    result = subprocess.run(
        'psql -U aurelinx -d aurelinx_db -c "SELECT 1;"',
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
    
    print("✅ aurelinx user can connect")
    return True

if __name__ == "__main__":
    success = setup_database()
    if success:
        print("\n✅ Database setup complete! Now run:")
        print("   python -m app.core.seed_data")
    else:
        print("\n❌ Database setup needs attention. See notes above.")
        sys.exit(1)
