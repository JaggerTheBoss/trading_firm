import os
import sys
print("Current directory:", os.getcwd())
print("Python path:", sys.path)
from config import Config
from trading_logic.app import create_app

app = create_app(Config)

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)