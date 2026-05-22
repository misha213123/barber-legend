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
    item.strip()
    for item in os.getenv("ADMIN_IDS", "").split(",")
    if item.strip()
]

conn = sqlite3.connect("bookings.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
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
        raise HTTPException(status_code=403, detail="Нет доступа")


def row_to_dict(row):
    return {
        "id": row[0],
        "telegram_id": row[1],
        "username": row[2],
        "first_name": row[3],
        "service": row[4],
        "master": row[5],
        "date": row[6],
        "time": row[7],
        "price": row[8],
        "status": row[9],
    }


@app.get("/")
def root():
    return {"status": "ok", "app": "Legend Barbershop"}


@app.get("/me/admin")
def check_admin(telegram_id: str):
    return {"is_admin": is_admin(telegram_id)}


@app.post("/bookings")
def create_booking(data: BookingCreate):
    cursor.execute("""
    SELECT id FROM bookings
    WHERE master = ? AND date = ? AND time = ? AND status != 'Отменена'
    """, (data.master, data.date, data.time))

    if cursor.fetchone():
        raise HTTPException(status_code=409, detail="Это время уже занято")

    cursor.execute("""
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
    return {"success": True, "booking_id": cursor.lastrowid}


@app.get("/bookings/{telegram_id}")
def get_my_bookings(telegram_id: str):
    cursor.execute("""
    SELECT * FROM bookings
    WHERE telegram_id = ?
    ORDER BY id DESC
    """, (telegram_id,))

    return [row_to_dict(row) for row in cursor.fetchall()]


@app.get("/admin/bookings")
def admin_bookings(telegram_id: int):
    if str(telegram_id) not in ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Not admin")

    conn = sqlite3.connect("bookings.db")
    conn.row_factory = sqlite3.Row

    rows = conn.execute("""
        SELECT *
        FROM bookings
        ORDER BY id DESC
    """).fetchall()

    conn.close()

    result = []

    for row in rows:
        result.append({
            "id": row["id"],
            "client_name": row["client_name"],
            "service": row["service"],
            "master": row["master"],
            "date": row["date"],
            "time": row["time"],
            "price": row["price"],
            "status": row["status"]
        })

    return result

@app.patch("/admin/bookings/{booking_id}/status")
def update_booking_status(
    booking_id: int,
    data: StatusUpdate,
    telegram_id: str = Query(...)
):
    require_admin(telegram_id)

    cursor.execute("""
    UPDATE bookings
    SET status = ?
    WHERE id = ?
    """, (data.status, booking_id))

    conn.commit()
    return {"success": True}


@app.get("/slots/busy")
def busy_slots(master: str, date: str):
    cursor.execute("""
    SELECT time FROM bookings
    WHERE master = ? AND date = ? AND status != 'Отменена'
    """, (master, date))

    return [row[0] for row in cursor.fetchall()]