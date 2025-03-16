import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'livetrade.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            handle TEXT UNIQUE NOT NULL,
            balance REAL DEFAULT 10000.0
        )
    ''')

    # Accounts table
    c.execute('''
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            size REAL NOT NULL,
            purchased_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Trades table
    c.execute('''
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            contract TEXT NOT NULL,
            amount INTEGER NOT NULL,
            action TEXT NOT NULL,
            profit REAL NOT NULL,
            trade_date TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    conn.commit()
    conn.close()
    print("Database initialized at", DB_PATH)

if __name__ == '__main__':
    init_db()