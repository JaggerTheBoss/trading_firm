from . import db  # Keep this, but it’s safe if __init__.py loads first
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    affiliate_code = db.Column(db.String(20), unique=True)
    accounts = db.relationship('Account', backref='user', lazy=True)
    referrals = db.relationship('Referral', foreign_keys='Referral.referrer_id', backref='referrer', lazy=True)

class Account(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    size = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='express')
    balance = db.Column(db.Float, default=0)
    highest_balance = db.Column(db.Float, default=0)
    mll = db.Column(db.Float)
    contract_limit = db.Column(db.Integer)
    winning_days = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    trades = db.relationship('Trade', backref='account', lazy=True)
    payouts = db.relationship('Payout', backref='account', lazy=True)

class Trade(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    type = db.Column(db.String(10))
    contract_type = db.Column(db.String(10))
    symbol = db.Column(db.String(20))
    quantity = db.Column(db.Integer)
    price = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    pnl = db.Column(db.Float)

class Payout(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    amount = db.Column(db.Float)
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='pending')

class Referral(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    referrer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    referred_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    commission = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)