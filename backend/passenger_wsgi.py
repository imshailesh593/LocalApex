import sys
import os

# Add backend directory to path when running via Passenger
sys.path.insert(0, os.path.dirname(__file__))

from main import app

# Passenger WSGI bridge for async FastAPI
from asgiref.wsgi import WsgiToAsgi

# Hostinger Passenger expects 'application'
application = app
