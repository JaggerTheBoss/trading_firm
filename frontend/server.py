from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import secrets  # For secure token generation

app = Flask(__name__)
CORS(app)
DB_PATH = os.path.join(os.path.dirname(__file__), 'livetrade.db')
API_URL = 'http://localhost:5000'

# In-memory session store (for testing; use a database in production)
sessions = {}

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email, password = data['email'], data['password']
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE email = ? AND password = ?', (email, password))
    user = c.fetchone()
    if user:
        # Generate a session token
        token = secrets.token_urlsafe(16)
        sessions[token] = {
            'id': user['id'],
            'email': user['email'],
            'handle': user['handle'],
            'balance': user['balance']
        }
        conn.close()
        return jsonify({'token': token})
    conn.close()
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/get_user', methods=['POST'])
def get_user():
    token = request.json.get('token')
    if token in sessions:
        return jsonify(sessions[token])
    return jsonify({'error': 'Invalid token'}), 401

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
    from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import secrets
import random  # For mock trade profit

app = Flask(__name__)
CORS(app)
DB_PATH = os.path.join(os.path.dirname(__file__), 'livetrade.db')
sessions = {}

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    email, password, handle = data['email'], data['password'], data['handle']
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute('INSERT INTO users (email, password, handle) VALUES (?, ?, ?)', (email, password, handle))
        conn.commit()
        user_id = c.lastrowid
        token = secrets.token_urlsafe(16)
        sessions[token] = {'id': user_id, 'email': email, 'handle': handle, 'balance': 10000}
        return jsonify({'token': token})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email or handle already taken'}), 400
    finally:
        conn.close()

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email, password = data['email'], data['password']
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE email = ? AND password = ?', (email, password))
    user = c.fetchone()
    if user:
        token = secrets.token_urlsafe(16)
        sessions[token] = {'id': user['id'], 'email': user['email'], 'handle': user['handle'], 'balance': user['balance']}
        c.execute('SELECT * FROM accounts WHERE user_id = ?', (user['id'],))
        accounts = [{'id': a['id'], 'size': a['size'], 'purchased': a['purchased_at']} for a in c.fetchall()]
        c.execute('SELECT * FROM trades WHERE user_id = ?', (user['id'],))
        trades = [{'contract': t['contract'], 'amount': t['amount'], 'action': t['action'], 'profit': t['profit'], 'date': t['trade_date']} for t in c.fetchall()]
        conn.close()
        return jsonify({'token': token, 'accounts': accounts, 'trades': trades})
    conn.close()
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/get_user', methods=['POST'])
def get_user():
    token = request.json.get('token')
    if token in sessions:
        user = sessions[token]
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM accounts WHERE user_id = ?', (user['id'],))
        accounts = [{'id': a['id'], 'size': a['size'], 'purchased': a['purchased_at']} for a in c.fetchall()]
        c.execute('SELECT * FROM trades WHERE user_id = ?', (user['id'],))
        trades = [{'contract': t['contract'], 'amount': t['amount'], 'action': t['action'], 'profit': t['profit'], 'date': t['trade_date']} for t in c.fetchall()]
        conn.close()
        return jsonify({**user, 'accounts': accounts, 'trades': trades})
    return jsonify({'error': 'Invalid token'}), 401

@app.route('/buy-account', methods=['POST'])  # Include this for completeness
def buy_account():
    data = request.json
    token, size = data['token'], data['size']
    if token not in sessions:
        return jsonify({'error': 'Invalid token'}), 401
    user_id = sessions[token]['id']
    costs = {50: 250, 100: 300, 150: 350}
    cost = costs.get(size)
    if not cost:
        return jsonify({'error': 'Invalid account size'}), 400
    
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT balance FROM users WHERE id = ?', (user_id,))
    user = c.fetchone()
    if not user or user['balance'] < cost:
        conn.close()
        return jsonify({'error': 'Insufficient balance'}), 400
    
    c.execute('UPDATE users SET balance = balance - ? WHERE id = ?', (cost, user_id))
    c.execute('INSERT INTO accounts (user_id, size, purchased_at) VALUES (?, ?, datetime("now"))', (user_id, size))
    conn.commit()
    
    c.execute('SELECT * FROM accounts WHERE user_id = ?', (user_id,))
    accounts = [{'id': a['id'], 'size': a['size'], 'purchased': a['purchased_at']} for a in c.fetchall()]
    sessions[token]['balance'] = user['balance'] - cost
    conn.close()
    return jsonify({'balance': sessions[token]['balance'], 'accounts': accounts})

@app.route('/trade', methods=['POST'])
def place_trade():
    data = request.json
    token, contract, amount, action = data['token'], data['contract'], data['amount'], data['action']
    if token not in sessions:
        return jsonify({'error': 'Invalid token'}), 401
    user_id = sessions[token]['id']
    profit = (random.random() * 200 - 100) * amount
    conn = get_db()
    c = conn.cursor()
    c.execute('INSERT INTO trades (user_id, contract, amount, action, profit, trade_date) VALUES (?, ?, ?, ?, ?, datetime("now"))', 
              (user_id, contract, amount, action, profit))
    c.execute('UPDATE users SET balance = balance + ? WHERE id = ?', (profit, user_id))
    conn.commit()
    
    c.execute('SELECT balance FROM users WHERE id = ?', (user_id,))
    balance = c.fetchone()['balance']
    c.execute('SELECT * FROM trades WHERE user_id = ?', (user_id,))
    trades = [{'contract': t['contract'], 'amount': t['amount'], 'action': t['action'], 'profit': t['profit'], 'date': t['trade_date']} for t in c.fetchall()]
    sessions[token]['balance'] = balance
    conn.close()
    return jsonify({'balance': balance, 'trades': trades})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)