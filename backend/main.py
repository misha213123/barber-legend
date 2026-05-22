import os
import sqlite3
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Legend Barbershop API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ADMIN_IDS = [
    x.strip()
    for x in os.getenv("ADMIN_IDS", "").split(",")
    if x.strip()
]

DB_PATH = "bookings.db"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    conn.execute("""
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT,
        username TEXT,
        first_name TEXT,
        service TEXT,
        master TEXT,
        date TEXT,
        time TEXT,
        price INTEGER,
        status TEXT DEFAULT 'Новая'
    )
    """)
    conn.commit()
    conn.close()


init_db()


class BookingCreate(BaseModel):
    telegram_id: str
    username: Optional[str] = ""
    first_name: Optional[str] = ""
    service: str
    master: str
    date: str
    time: str
    price: int


class StatusUpdate(BaseModel):
    status: str


def is_admin(telegram_id: str) -> bool:
    return str(telegram_id) in ADMIN_IDS


def require_admin(telegram_id: str):
    if not is_admin(telegram_id):
        raise HTTPException(status_code=403, detail="Not admin")


def row_to_dict(row):
    return {
        "id": row["id"],
        "telegram_id": row["telegram_id"],
        "username": row["username"],
        "first_name": row["first_name"],
        "service": row["service"],
        "master": row["master"],
        "date": row["date"],
        "time": row["time"],
        "price": row["price"],
        "status": row["status"],
    }


@app.get("/")
def root():
    return {
        "status": "ok",
        "app": "Legend Barbershop",
        "admins": len(ADMIN_IDS)
    }


@app.get("/me/admin")
def check_admin(telegram_id: str):
    return {"is_admin": is_admin(telegram_id), "telegram_id": telegram_id}


@app.post("/bookings")
def create_booking(data: BookingCreate):
    conn = get_conn()

    exists = conn.execute("""
        SELECT id FROM bookings
        WHERE master = ? AND date = ? AND time = ? AND status != 'Отменена'
    """, (data.master, data.date, data.time)).fetchone()

    if exists:
        conn.close()
        raise HTTPException(status_code=409, detail="Это время уже занято")

    cur = conn.execute("""
        INSERT INTO bookings (
            telegram_id, username, first_name, service,
            master, date, time, price, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.telegram_id,
        data.username,
        data.first_name,
        data.service,
        data.master,
        data.date,
        data.time,
        data.price,
        "Новая"
    ))

    conn.commit()
    booking_id = cur.lastrowid
    conn.close()

    return {"success": True, "booking_id": booking_id}


@app.get("/bookings/{telegram_id}")
def get_my_bookings(telegram_id: str):
    conn = get_conn()
    rows = conn.execute("""
        SELECT * FROM bookings
        WHERE telegram_id = ?
        ORDER BY id DESC
    """, (telegram_id,)).fetchall()
    conn.close()

    return [row_to_dict(row) for row in rows]


@app.get("/admin/bookings")
def admin_bookings(telegram_id: str = Query(...)):
    require_admin(telegram_id)

    conn = get_conn()
    rows = conn.execute("""
        SELECT * FROM bookings
        ORDER BY id DESC
    """).fetchall()
    conn.close()

    return [row_to_dict(row) for row in rows]


@app.patch("/admin/bookings/{booking_id}/status")
def update_booking_status(
    booking_id: int,
    data: StatusUpdate,
    telegram_id: str = Query(...)
):
    require_admin(telegram_id)

    conn = get_conn()
    conn.execute("""
        UPDATE bookings
        SET status = ?
        WHERE id = ?
    """, (data.status, booking_id))
    conn.commit()
    conn.close()

    return {"success": True}


@app.get("/slots/busy")
def busy_slots(master: str, date: str):
    conn = get_conn()
    rows = conn.execute("""
        SELECT time FROM bookings
        WHERE master = ? AND date = ? AND status != 'Отменена'
    """, (master, date)).fetchall()
    conn.close()

    return [row["time"] for row in rows]