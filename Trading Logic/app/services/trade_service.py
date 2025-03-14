from .. import db
from ..models import Account, Trade
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
            multiplier = 50 if contract_type == 'mini' else 5  # Adjust per CME contract (ES: $50/tick, NQ: $20/tick, etc.)
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
        return {"error": f"Need {min_days} winning days"}

    payout = min(account.balance, 5000)
    split = 0 if account.balance <= 12000 else (payout - max(0, 12000 - (account.balance - payout))) * 0.1
    trader_payout = payout - split

    account.balance -= payout
    db.session.add(Payout(account_id=account_id, amount=trader_payout))
    db.session.commit()
    logger.info(f"Payout of ${trader_payout} requested for account {account_id}")
    return {"status": "success", "payout": trader_payout, "our_split": split}

def set_trade_copier(account_id, copier_id, socketio):
    copier = Account.query.get(copier_id)
    if not copier or copier.winning_days < 30 or copier.status != 'live':
        socketio.emit('copier_error', {'message': 'Invalid copier ID'}, namespace='/trades')
        return

    @socketio.on('trade_update', namespace='/trades')
    def replicate_trade(trade_data):
        if trade_data['account_id'] == copier_id:
            account = Account.query.get(account_id)
            if account.status in ['express', 'live']:
                trade = Trade(account_id=account_id, type=trade_data['type'], contract_type=trade_data['contract_type'], 
                              symbol=trade_data['symbol'], quantity=min(trade_data['quantity'], account.contract_limit if trade_data['contract_type'] == 'mini' else account.contract_limit * 10), 
                              price=trade_data['price'], pnl=trade_data['pnl'])
                account.balance += trade.pnl or 0
                if account.balance < (account.highest_balance - account.mll):
                    account.status = 'paper'
                db.session.add(trade)
                db.session.commit()
                socketio.emit('trade_update', {'account_id': account_id, 'balance': account.balance, 'pnl': trade.pnl}, namespace='/trades')

    socketio.emit('copier_set', {'account_id': account_id, 'copier_id': copier_id}, namespace='/trades')
    logger.info(f"Trade Copier set for account {account_id} to copy {copier_id}")