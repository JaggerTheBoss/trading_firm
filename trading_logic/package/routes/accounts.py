from flask import Blueprint, request, jsonify
from ..app import db  # CHANGED: import db from app/__init__.py
from ..app.models import User, Account, Referral  # CHANGED: import models from app.models
import logging

accounts_bp = Blueprint('accounts', __name__)
logger = logging.getLogger(__name__)

@accounts_bp.route('/account/buy', methods=['POST'])
def buy_account():
    data = request.json
    user_id = data['user_id']
    quantity = min(data['quantity'], 5)
    size = data['size']
    affiliate_code = data.get('affiliate_code')

    prices = {50000: 250, 100000: 300, 150000: 350}
    mlls = {50000: 2000, 100000: 3000, 150000: 4500}
    contracts = {50000: 5, 100000: 10, 150000: 15}

    if size not in prices:
        return jsonify({"error": "Invalid account size"}), 400

    price = prices[size]
    if affiliate_code:
        referrer = User.query.filter_by(affiliate_code=affiliate_code).first()
        if referrer:
            price *= 0.9
            referral_count = Referral.query.filter_by(referrer_id=referrer.id).count()
            commission = price * 0.1
            db.session.add(Referral(referrer_id=referrer.id, referred_user_id=user_id, commission=commission))
            if referral_count % 3 == 2:
                db.session.add(Account(user_id=referrer.id, size=50000, balance=50000, highest_balance=50000, mll=2000, contract_limit=5))

    total_cost = price * quantity
    for _ in range(quantity):
        account = Account(
            user_id=user_id, size=size, balance=size, highest_balance=size,
            mll=mlls[size], contract_limit=contracts[size], status='express'
        )
        db.session.add(account)
    db.session.commit()
    logger.info(f"User {user_id} bought {quantity} ${size} Express accounts for ${total_cost}")
    return jsonify({"status": "success", "total_cost": total_cost})

@accounts_bp.route('/account/reset/<int:account_id>', methods=['POST'])
def reset_account(account_id):
    account = Account.query.get_or_404(account_id)
    if account.status != 'paper':
        return jsonify({"error": "Account not in paper mode"}), 400

    reset_prices = {50000: 188, 100000: 225, 150000: 263}
    cost = reset_prices[account.size]

    account.status = 'express'
    account.balance = account.size
    account.highest_balance = account.size
    account.winning_days = 0
    db.session.commit()
    logger.info(f"Account {account_id} reset to Express for ${cost}")
    return jsonify({"status": "success", "cost": cost})
