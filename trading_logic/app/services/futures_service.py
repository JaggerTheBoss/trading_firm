import websocket
import json
import threading
import os
import logging
from .. import db
from ..models import Trade

logger = logging.getLogger(__name__)

class AlpacaClient:
    def __init__(self, socketio):
        self.socketio = socketio
        self.running = False
        self.api_key = os.getenv('ALPACA_API_KEY')
        self.secret_key = os.getenv('ALPACA_SECRET_KEY')
        self.symbols = ["ES", "NQ", "YM"]  # Alpaca futures symbols
        self.prices = {symbol: 0 for symbol in self.symbols}
        self.ws = None

    def on_message(self, ws, message):
        data = json.loads(message)
        if isinstance(data, list):
            for event in data:
                if event.get('T') == 't':  # Trade message
                    symbol = event['S'].split('/')[0]  # e.g., "ES" from "ES/MINI"
                    price = event['p']
                    self.prices[symbol] = price
                    logger.info(f"Real-time {symbol} price: ${price}")
                    self.socketio.emit('price_update', {'symbol': f"{symbol}1!", 'price': price}, namespace='/trades')

    def on_error(self, ws, error):
        logger.error(f"WebSocket error: {error}")

    def on_open(self, ws):
        logger.info("Connected to Alpaca")
        auth_msg = {"action": "auth", "key": self.api_key, "secret": self.secret_key}
        ws.send(json.dumps(auth_msg))
        sub_msg = {"action": "subscribe", "trades": [f"{sym}/MINI" for sym in self.symbols]}
        ws.send(json.dumps(sub_msg))

    def start(self):
        self.running = True
        self.ws = websocket.WebSocketApp(
            "wss://stream.data.alpaca.markets/v2/futures",
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error
        )
        thread = threading.Thread(target=self.ws.run_forever)
        thread.daemon = True
        thread.start()
        logger.info("Alpaca client started for CME futures")

    def stop(self):
        self.running = False
        if self.ws:
            self.ws.close()

    def execute_trade(self, account_id, trade_type, contract_type, symbol, quantity, price=None):
        if price is None:
            price = self.prices.get(symbol, 5432)
        full_symbol = f"{symbol}1!"  # Match frontend format
        logger.info(f"Express trade: {trade_type} {quantity} {contract_type} {full_symbol} for account {account_id} @ ${price}")
        trade = Trade(account_id=account_id, type=trade_type, contract_type=contract_type, symbol=full_symbol, quantity=quantity, price=price)
        db.session.add(trade)
        return trade

futures_client = None

def init_futures_client(socketio):
    global futures_client
    futures_client = AlpacaClient(socketio)
    futures_client.start()