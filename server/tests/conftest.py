import os

# Set environment variables for testing before any app modules are imported
os.environ["ALLOWED_HOSTS"] = "*"
os.environ["ENVIRONMENT"] = "development"
