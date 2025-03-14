from flask import Flask
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
import logging
from config import Config

# Define db first
db = SQLAlchemy()
socketio = SocketIO(cors_allowed_origins="*")

# Now import modules that use db
from .utils.scheduler import init_scheduler
from .services.futures_service import init_futures_client

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    socketio.init_app(app)

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    from .routes.accounts import accounts_bp
    from .routes.trades import trades_bp
    from .routes.stats import stats_bp
    app.register_blueprint(accounts_bp, url_prefix='/api')
    app.register_blueprint(trades_bp, url_prefix='/api')
    app.register_blueprint(stats_bp, url_prefix='/api')

    with app.app_context():
        db.create_all()
        init_scheduler(app, socketio)
        init_futures_client(socketio)

    return app

def run_app():
    app = create_app()
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)