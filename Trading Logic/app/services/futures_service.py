import threading
import time
import logging
from .. import db
from ..models import Trade

logger = logging.getLogger(__name__)

class FuturesClient:
    def __init__(self, socketio):
        self.socketio = socketio
        self.running = False
        self.prices = {"ES1!": 5432, "NQ1!": 19000, "YM1!": 40000}  # Fallbacks

    def start(self):
        self.running = True
        logger.info("Futures client started—waiting for frontend price updates")

    def stop(self):
        self.running = False

    def update_price(self, symbol, price):
        self.prices[symbol] = price
        logger.info(f"Updated {symbol} price from frontend: ${price}")

    def execute_trade(self, account_id, trade_type, contract_type, symbol, quantity, price=None):
        if price is None:
            price = self.prices.get(symbol, 5432)
        logger.info(f"Express trade: {trade_type} {quantity} {contract_type} {symbol} for account {account_id} @ ${price}")
        trade = Trade(account_id=account_id, type=trade_type, contract_type=contract_type, symbol=symbol, quantity=quantity, price=price)
        db.session.add(trade)
        return trade

futures_client = None

def init_futures_client(socketio):
    global futures_client
    futures_client = FuturesClient(socketio)
    futures_client.start()

    @socketio.on('price_update', namespace='/trades')
    def handle_price_update(data):
        symbol = data.get('symbol')
        price = data.get('price')
        if symbol and price:
            futures_client.update_price(symbol, price)