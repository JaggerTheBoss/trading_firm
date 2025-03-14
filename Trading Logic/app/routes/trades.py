from flask import Blueprint, request, jsonify
from .. import db, socketio
from ..models import Account, Trade, Payout
from ..services.trade_service import execute_trade, request_payout
from datetime import datetime, timedelta
import logging

trades_bp = Blueprint('trades', __name__)
logger = logging.getLogger(__name__)

@trades_bp.route('/trade', methods=['POST'])
def trade():
    data = request.json
    result = execute_trade(data['account_id'], data['type'], data['contract_type'], data['quantity'], data['price'])
    if "error" in result:
        return jsonify(result), 400
    socketio.emit('trade_update', result, namespace='/trades')
    return jsonify(result)

@trades_bp.route('/payout/<int:account_id>', methods=['POST'])
def payout(account_id):
    result = request_payout(account_id)
    if "error" in result:
        return jsonify(result), 400
    socketio.emit('payout_requested', {'account_id': account_id, 'amount': result['payout']}, namespace='/trades')
    return jsonify(result)

@trades_bp.route('/tilt', methods=['GET'])
def get_tilt():
    trades = Trade.query.filter(Trade.timestamp > datetime.utcnow() - timedelta(hours=1)).all()
    total = len(trades) or 1
    long_count = sum(1 for t in trades if t.type == 'buy')
    long_percent = (long_count / total) * 100
    short_percent = 100 - long_percent
    tilt = {"long": round(long_percent), "short": round(short_percent)}
    socketio.emit('tilt_update', tilt, namespace='/trades')
    return jsonify(tilt)

@socketio.on('set_copier', namespace='/trades')
def set_trade_copier(data):
    from ..services.trade_service import set_trade_copier
    set_trade_copier(data['account_id'], data['copier_id'], socketio)