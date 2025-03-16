from .. import db
from ..models import Account, Trade, Payout  # <-- ADDED Payout here!
from ..services.futures_service import futures_client
import logging

logger = logging.getLogger(__name__)

def execute_trade(account_id, trade_type, contract_type, symbol, quantity, price=None):
    account = Account.query.get_or_404(account_id)
    if account.status not in ['express', 'live']:
        return {"error": "Account not active (express or live)"}

    max_micros = account.contract_limit * 10
    if (contract_type == 'mini' and quantity > account.contract_limit) or (contract_type == 'micro' and quantity > max_micros):
        return {"error": "Exceeds contract limit"}

    trade = futures_client.execute_trade(account_id, trade_type, contract_type, symbol, quantity, price)
    last_trade = Trade.query.filter_by(account_id=account_id).order_by(Trade.timestamp.desc()).offset(1).first()
    pnl = 0
    if last_trade and last_trade.pnl is None and last_trade != trade:
        if last_trade.type != trade_type:
            multiplier = 50 if contract_type == 'mini' else 5  # Adjust per CME contract
            pnl = (trade.price - last_trade.price) * last_trade.quantity * multiplier * (1 if trade_type == 'sell' else -1)
            last_trade.pnl = pnl

    account.balance += pnl
    account.highest_balance = max(account.highest_balance, account.balance)

    if account.balance < (account.highest_balance - account.mll):
        account.status = 'paper'
        db.session.commit()
        logger.info(f"Account {account_id} liquidated: balance ${account.balance}")
        return {"status": "liquidated", "new_balance": account.balance}

    if pnl > 0 and pnl >= 200:
        account.winning_days += 1
        if account.winning_days >= 30 and account.status == 'express':
            account.status = 'live'
            logger.info(f"Account {account_id} upgraded to live after 30 winning days")

    db.session.commit()
    logger.info(f"Trade executed for account {account_id}: {trade_type} {quantity} {contract_type} {symbol} @ ${trade.price}")
    return {"status": "success", "pnl": pnl, "new_balance": account.balance}

def request_payout(account_id):
    account = Account.query.get_or_404(account_id)
    if account.status not in ['express', 'live']:
        return {"error": "Account not active"}

    min_days = 5 if account.winning_days >= 30 else 7
    if account.winning_days < min_days:
        return {"error": f'Need {min_days} winning days'}

    payout = min(account.balance, 5000)
    split = 0 if account.balance <= 12000 else (payout - max(0, 12000 - (account.balance - payout))) * 0.1
    trader_payout = payout - split

    account.balance -= payout
    # Using Payout model here - so we need the import from models
    db.session.add(Payout(account_id=account_id, amount=trader_payout))
    db.session.commit()

    logger.info(f"Payout of ${trader_payout} requested for account {account_id}")
    return {"status": "success", "payout": trader_payout, "our_split": split}

def set_trade_copier(account_id, copier_id, socketio):
    ...
    # no changes needed unless you also want to import Payout here, but doesn't look like it
