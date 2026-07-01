import sys
import os

# Add backend directory to Python path when running under Passenger
sys.path.insert(0, os.path.dirname(__file__))

# Load env from .env file (Hostinger doesn't set env vars automatically)
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from main import app

# Hostinger Passenger expects the ASGI app as 'application'
application = app
