# LiveTrade Legends Platform

## Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Set up PostgreSQL database and update `.env` with `DATABASE_URL`.
3. Run the app: `python run.py`

## Structure
- `app/`: Core application
  - `__init__.py`: App factory
  - `models.py`: DB models
  - `routes/`: API endpoints
  - `services/`: Business logic
  - `utils/`: Helper functions
- `config.py`: Configuration
- `run.py`: Entry point

## Running
- Development: `python run.py`
- Production: `gunicorn -w 4 -b 0.0.0.0:5000 run:app`

## Endpoints
- `/api/account/buy`: Buy accounts
- `/api/account/reset/<id>`: Reset paper account
- `/api/trade`: Execute trade
- `/api/payout/<id>`: Request payout
- `/api/tilt`: Get Tilt Indicator
- `/api/stats/<id>`: Get account stats

## WebSocket
- Namespace: `/trades`
- Events: `trade_update`, `tilt_update`, `set_copier`, `trade_closed`