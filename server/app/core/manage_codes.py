import argparse
import secrets
import string
import sys
from datetime import datetime
from sqlmodel import Session, select

from app.models.database import engine, RegistrationCodeTable
from app.core.security import hash_password

def generate_secure_code(length=12):
    # Ensure characters from different groups
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    while True:
        code = ''.join(secrets.choice(alphabet) for _ in range(length))
        # Ensure it has at least one lowercase, uppercase, digit, and symbol
        if (any(c.islower() for c in code)
            and any(c.isupper() for c in code)
            and any(c.isdigit() for c in code)
            and any(c in "!@#$%^&*()-_=+" for c in code)):
            return code

def create_code(length):
    if length < 8 or length > 32:
        print("Error: Length must be between 8 and 32 characters.")
        sys.exit(1)
        
    plain_code = generate_secure_code(length)
    hashed = hash_password(plain_code)
    
    with Session(engine) as session:
        db_code = RegistrationCodeTable(
            code_hash=hashed,
            is_used=False
        )
        session.add(db_code)
        session.commit()
        session.refresh(db_code)
        
        print("\n" + "=" * 50)
        print("🎉 SECURE ADMIN ID GENERATED SUCCESSFULLY")
        print("=" * 50)
        print(f"ID:          {db_code.id}")
        print(f"Admin ID:    {plain_code}")
        print("=" * 50)
        print("⚠️  Copy and share this code with the user. It cannot be shown again!")
        print("=" * 50 + "\n")

def list_codes():
    with Session(engine) as session:
        statement = select(RegistrationCodeTable).order_by(RegistrationCodeTable.created_at.desc())
        codes = session.exec(statement).all()
        
        if not codes:
            print("\nNo Admin IDs found in the database.\n")
            return
            
        print("\n" + "=" * 80)
        print(f"{'CODE ID':<38} | {'STATUS':<8} | {'CREATED AT':<20} | {'USED BY':<20}")
        print("-" * 80)
        for c in codes:
            status = "USED" if c.is_used else "ACTIVE"
            used_by = c.used_by if c.used_by else "-"
            created_str = c.created_at.strftime("%Y-%m-%d %H:%M:%S")
            print(f"{str(c.id):<38} | {status:<8} | {created_str:<20} | {used_by:<20}")
        print("=" * 80 + "\n")

def revoke_code(code_id_str):
    with Session(engine) as session:
        statement = select(RegistrationCodeTable).where(RegistrationCodeTable.id == code_id_str)
        code = session.exec(statement).first()
        
        if not code:
            print(f"\nError: Admin ID with database ID '{code_id_str}' not found.\n")
            sys.exit(1)
            
        session.delete(code)
        session.commit()
        print(f"\nSuccess: Admin ID {code_id_str} has been deleted/revoked.\n")

def main():
    parser = argparse.ArgumentParser(description="Manage Aurelinx Admin IDs / Registration Codes.")
    parser.add_argument("--generate", action="store_true", help="Generate a new secure Admin ID")
    parser.add_argument("--length", type=int, default=12, help="Length of the code to generate (8-32, default 12)")
    parser.add_argument("--list", action="store_true", help="List all generated codes")
    parser.add_argument("--revoke", type=str, help="Revoke/Delete an Admin ID by its Database UUID")
    
    args = parser.parse_args()
    
    if args.generate:
        create_code(args.length)
    elif args.list:
        list_codes()
    elif args.revoke:
        revoke_code(args.revoke)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
