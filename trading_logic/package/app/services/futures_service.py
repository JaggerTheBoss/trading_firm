import websocket
import json
import threading
import os
import logging
from datetime import datetime
import pytz

# If you store db/Trade in "app/__init__.py" or "app/models.py", import them accordingly:
# from ..app import db
# from ..app.models import Trade
from .. import db
from ..models import Trade

logger = logging.getLogger(__name__)

def is_cme_market_hours():
    """
    Naive check:
      - Sunday >= 18:00 ET to Friday <= 17:00 ET => "open"
      - Ignores daily breaks (4:15pm - 4:30pm), so it's approximate.
    """
    now = datetime.now(pytz.timezone('US/Eastern'))
    day_of_week = now.weekday()  # Monday=0, Sunday=6
    hour = now.hour
    minute = now.minute

    # Sunday: open from 18:00 onward
    if day_of_week == 6:  # Sunday
        return (hour > 18) or (hour == 18 and minute >= 0)

    # Monday - Thursday: open nearly 24 hours
    if 0 <= day_of_week <= 3:
        return True

    # Friday: open until 17:00
    if day_of_week == 4:  # Friday
        if hour < 17 or (hour == 17 and minute == 0):
            return True
        else:
            return False

    # Saturday: closed
    return False

class AlpacaClient:
    def __init__(self, socketio):
        self.socketio = socketio
        self.running = False
        # Credentials from your environment (.env)
        self.api_key = os.getenv('ALPACA_API_KEY')
        self.secret_key = os.getenv('ALPACA_SECRET_KEY')

        # We'll subscribe to these futures during open times
        self.futures_symbols = ["ES", "NQ", "YM"]
        # We'll use "FAKEPACA" symbol for the test stream
        self.test_symbol = "FAKEPACA"

        # We'll pick whichever set is relevant at runtime
        self.symbols_in_use = []
        self.prices = {}
        self.ws = None

    def on_message(self, ws, message):
        data = json.loads(message)
        if isinstance(data, list):
            for event in data:
                if event.get('T') == 't':  # Trade event
                    symbol = event['S']
                    price = event['p']
                    self.prices[symbol] = price
                    logger.info(f"Got trade for {symbol}: ${price}")
                    # Emit socketio event so front-end or other subscribers can see it
                    self.socketio.emit(
                        'price_update',
                        {'symbol': symbol, 'price': price},
                        namespace='/trades'
                    )

    def on_error(self, ws, error):
        logger.error(f"WebSocket error: {error}")

    def on_open(self, ws):
        if is_cme_market_hours():
            logger.info("Connected to Alpaca real-time SIP feed (CME futures likely open).")
            sub_symbols = self.futures_symbols
        else:
            logger.info("Connected to Alpaca test stream (outside market hours?).")
            sub_symbols = [self.test_symbol]

        # 1) Authenticate
        auth_msg = {
            "action": "auth",
            "key": self.api_key,
            "secret": self.secret_key
        }
        ws.send(json.dumps(auth_msg))

        # 2) Subscribe to trades for the relevant symbols
        sub_msg = {
            "action": "subscribe",
            "trades": sub_symbols
        }
        ws.send(json.dumps(sub_msg))
        self.symbols_in_use = sub_symbols
        self.prices = {s: 0 for s in sub_symbols}

    def start(self):
        self.running = True
        # Decide the correct WebSocket URL based on day/time
        if is_cme_market_hours():
            ws_url = "wss://stream.data.alpaca.markets/v2/sip"
        else:
            ws_url = "wss://stream.data.alpaca.markets/v2/test"

        logger.info(f"Using WebSocket URL: {ws_url}")
        self.ws = websocket.WebSocketApp(
            ws_url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error
        )
        thread = threading.Thread(target=self.ws.run_forever)
        thread.daemon = True
        thread.start()

        logger.info("Alpaca client started (auto-switch between real & test streams).")

    def stop(self):
        self.running = False
        if self.ws:
            self.ws.close()

    def execute_trade(self, account_id, trade_type, contract_type, symbol, quantity, price=None):
        if price is None:
            price = self.prices.get(symbol, 9999)
        logger.info(f"Executing trade in local DB: {trade_type} {quantity} {contract_type} {symbol} at ${price}")
        trade = Trade(
            account_id=account_id,
            type=trade_type,
            contract_type=contract_type,
            symbol=symbol,
            quantity=quantity,
            price=price
        )
        db.session.add(trade)
        return trade

futures_client = None

def init_futures_client(socketio):
    global futures_client
    futures_client = AlpacaClient(socketio)
    futures_client.start()
