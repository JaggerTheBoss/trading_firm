from flask import Blueprint, jsonify
from ..app import db  # CHANGED
from ..app.models import Account, Trade  # CHANGED

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/stats/<int:account_id>', methods=['GET'])
def get_stats(account_id):
    account = Account.query.get_or_404(account_id)
    daily_data = db.session.query(
        db.func.date(Trade.timestamp),
        db.func.sum(Trade.pnl),
        db.func.count(Trade.id)
    ).filter_by(account_id=account_id) \
     .group_by(db.func.date(Trade.timestamp)) \
     .order_by(db.func.date(Trade.timestamp).desc()) \
     .all()

    stats = {
        "total_pnl": account.balance - account.size,
        "winning_days": account.winning_days,
        "max_drawdown": account.highest_balance - min(account.balance, account.highest_balance),
        "trade_count": Trade.query.filter_by(account_id=account_id).count(),
        "daily_stats": [
            {
                "date": str(date),
                "pnl": float(pnl or 0),
                "trades": trades
            }
            for date, pnl, trades in daily_data
        ]
    }
    return jsonify(stats)
