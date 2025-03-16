from apscheduler.schedulers.background import BackgroundScheduler
import pytz
from ..services.futures_service import futures_client
import logging

logger = logging.getLogger(__name__)

def init_scheduler(app, socketio):
    scheduler = BackgroundScheduler(timezone=pytz.timezone('US/Eastern'))

    def close_trades():
        from .. import db  # Import here
        from ..models import Account, Trade  # Import here
        with app.app_context():
            accounts = Account.query.filter(Account.status.in_(['express', 'live'])).all()
            for account in accounts:
                open_trades = Trade.query.filter_by(account_id=account.id, pnl=None).all()
                for trade in open_trades:
                    try:
                        market_price = futures_client.symbols[trade.symbol].get_analysis().indicators["close"]
                    except Exception as e:
                        logger.error(f"Error fetching closing price for {trade.symbol}: {e}")
                        market_price = 5432  # Fallback
                    multiplier = 50 if trade.contract_type == 'mini' else 5
                    pnl = (market_price - trade.price) * trade.quantity * multiplier * (1 if trade.type == 'sell' else -1)
                    trade.pnl = pnl
                    account.balance += pnl
                    account.highest_balance = max(account.highest_balance, account.balance)
                    if account.balance < (account.highest_balance - account.mll):
                        account.status = 'paper'
                db.session.commit()
                socketio.emit('trade_closed', {'account_id': account.id, 'balance': account.balance}, namespace='/trades')
            logger.info("Trades closed at 4:10 PM EST")

    scheduler.add_job(close_trades, 'cron', hour=16, minute=10)
    scheduler.start()