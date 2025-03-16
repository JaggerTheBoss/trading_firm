import os
import sys

from package.config import Config
from package.app import create_app

app = create_app(Config)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)