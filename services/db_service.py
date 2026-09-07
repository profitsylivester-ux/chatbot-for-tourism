import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "db" / "tourism_chat.db"

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        created_at TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER,
        role TEXT,
        content TEXT,
        created_at TEXT
    )""")

    conn.commit()
    conn.close()


def create_conversation(title="New Chat"):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO conversations (title, created_at) VALUES (?, ?)",
        (title, datetime.now().isoformat())
    )
    conn.commit()
    return c.lastrowid


def save_message(conv_id, role, content):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO messages VALUES (NULL, ?, ?, ?, ?)",
        (conv_id, role, content, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()


def rename_conversation(conv_id, title):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "UPDATE conversations SET title = ? WHERE id = ?",
        (title[:80], conv_id),
    )
    conn.commit()
    conn.close()


def list_conversations(limit=12):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        """
        SELECT c.id, c.title, c.created_at,
               (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'user'
                ORDER BY id LIMIT 1) AS first_message
        FROM conversations c
        ORDER BY c.id DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    conn.close()
    return [
        {
            "id": row[0],
            "title": row[1],
            "created_at": row[2],
            "preview": row[3] or "New conversation",
        }
        for row in rows
    ]


def get_conversation_messages(conv_id):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id",
        (conv_id,),
    ).fetchall()
    conn.close()
    return [{"role": row[0], "content": row[1]} for row in rows]


def delete_conversation(conv_id):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
    conn.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
    conn.commit()
    conn.close()