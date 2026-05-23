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


def is_admin(telegram_id: str) -> bool:
    return str(telegram_id) in ADMIN_IDS


def require_admin(telegram_id: str):
    if not is_admin(telegram_id):
        raise HTTPException(status_code=403, detail="Not admin")


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

    conn.execute("""
    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        duration INTEGER DEFAULT 30,
        price INTEGER DEFAULT 0,
        icon TEXT DEFAULT '✂️',
        image TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1
    )
    """)

    conn.execute("""
    CREATE TABLE IF NOT EXISTS masters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT DEFAULT '',
        rating TEXT DEFAULT '5.0',
        reviews INTEGER DEFAULT 0,
        image TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1
    )
    """)

    services_count = conn.execute("SELECT COUNT(*) FROM services").fetchone()[0]
    masters_count = conn.execute("SELECT COUNT(*) FROM masters").fetchone()[0]

    if services_count == 0:
        default_services = [
            ("Стрижка", "Классическая мужская стрижка с укладкой", 45, 120, "✂️", "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=600&auto=format&fit=crop", 1),
            ("Стрижка + борода", "Стрижка и оформление бороды", 60, 160, "🧔", "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&auto=format&fit=crop", 1),
            ("Королевское бритьё", "Бритьё опасной бритвой + уход", 40, 110, "🪒", "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600&auto=format&fit=crop", 1),
            ("Детская стрижка", "Стрижка для детей до 12 лет", 30, 90, "👦", "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=600&auto=format&fit=crop", 1),
        ]

        conn.executemany("""
        INSERT INTO services (name, description, duration, price, icon, image, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, default_services)

    if masters_count == 0:
        default_masters = [
            ("Алексей", "Топ-барбер", "4.9", 243, "https://images.unsplash.com/photo-1618077360395-f3068be8e001?q=80&w=300&auto=format&fit=crop", 1),
            ("Дмитрий", "Барбер", "4.8", 165, "https://images.unsplash.com/photo-1622286346003-c2e63b378f17?q=80&w=300&auto=format&fit=crop", 1),
            ("Максим", "Барбер", "4.9", 112, "https://images.unsplash.com/photo-1590086783191-a0694c7d1e6e?q=80&w=300&auto=format&fit=crop", 1),
            ("Игорь", "Барбер", "4.7", 98, "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop", 1),
        ]

        conn.executemany("""
        INSERT INTO masters (name, role, rating, reviews, image, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        """, default_masters)

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


class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    duration: int = 30
    price: int = 0
    icon: Optional[str] = "✂️"
    image: Optional[str] = ""
    is_active: int = 1


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    price: Optional[int] = None
    icon: Optional[str] = None
    image: Optional[str] = None
    is_active: Optional[int] = None


class MasterCreate(BaseModel):
    name: str
    role: Optional[str] = ""
    rating: Optional[str] = "5.0"
    reviews: int = 0
    image: Optional[str] = ""
    is_active: int = 1


class MasterUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    rating: Optional[str] = None
    reviews: Optional[int] = None
    image: Optional[str] = None
    is_active: Optional[int] = None


def booking_to_dict(row):
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


def service_to_dict(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "desc": row["description"],
        "description": row["description"],
        "duration": row["duration"],
        "price": row["price"],
        "icon": row["icon"],
        "img": row["image"],
        "image": row["image"],
        "is_active": row["is_active"],
    }


def master_to_dict(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "role": row["role"],
        "rating": row["rating"],
        "reviews": row["reviews"],
        "img": row["image"],
        "image": row["image"],
        "is_active": row["is_active"],
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


@app.get("/services")
def get_services(include_inactive: int = 0):
    conn = get_conn()

    if include_inactive:
        rows = conn.execute("SELECT * FROM services ORDER BY id DESC").fetchall()
    else:
        rows = conn.execute("SELECT * FROM services WHERE is_active = 1 ORDER BY id DESC").fetchall()

    conn.close()
    return [service_to_dict(row) for row in rows]


@app.get("/masters")
def get_masters(include_inactive: int = 0):
    conn = get_conn()

    if include_inactive:
        rows = conn.execute("SELECT * FROM masters ORDER BY id DESC").fetchall()
    else:
        rows = conn.execute("SELECT * FROM masters WHERE is_active = 1 ORDER BY id DESC").fetchall()

    conn.close()
    return [master_to_dict(row) for row in rows]


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
    return [booking_to_dict(row) for row in rows]


@app.get("/admin/bookings")
def admin_bookings(telegram_id: str = Query(...)):
    require_admin(telegram_id)

    conn = get_conn()

    rows = conn.execute("""
        SELECT * FROM bookings
        ORDER BY id DESC
    """).fetchall()

    conn.close()
    return [booking_to_dict(row) for row in rows]


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


@app.post("/admin/services")
def admin_create_service(data: ServiceCreate, telegram_id: str = Query(...)):
    require_admin(telegram_id)

    conn = get_conn()

    cur = conn.execute("""
        INSERT INTO services (name, description, duration, price, icon, image, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        data.name,
        data.description,
        data.duration,
        data.price,
        data.icon,
        data.image,
        data.is_active
    ))

    conn.commit()
    service_id = cur.lastrowid
    conn.close()

    return {"success": True, "id": service_id}


@app.patch("/admin/services/{service_id}")
def admin_update_service(
    service_id: int,
    data: ServiceUpdate,
    telegram_id: str = Query(...)
):
    require_admin(telegram_id)

    fields = []
    values = []

    mapping = {
        "name": data.name,
        "description": data.description,
        "duration": data.duration,
        "price": data.price,
        "icon": data.icon,
        "image": data.image,
        "is_active": data.is_active,
    }

    for key, value in mapping.items():
        if value is not None:
            fields.append(f"{key} = ?")
            values.append(value)

    if not fields:
        return {"success": True}

    values.append(service_id)

    conn = get_conn()

    conn.execute(f"""
        UPDATE services
        SET {", ".join(fields)}
        WHERE id = ?
    """, values)

    conn.commit()
    conn.close()

    return {"success": True}


@app.delete("/admin/services/{service_id}")
def admin_delete_service(service_id: int, telegram_id: str = Query(...)):
    require_admin(telegram_id)

    conn = get_conn()
    conn.execute("DELETE FROM services WHERE id = ?", (service_id,))
    conn.commit()
    conn.close()

    return {"success": True}


@app.post("/admin/masters")
def admin_create_master(data: MasterCreate, telegram_id: str = Query(...)):
    require_admin(telegram_id)

    conn = get_conn()

    cur = conn.execute("""
        INSERT INTO masters (name, role, rating, reviews, image, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        data.name,
        data.role,
        data.rating,
        data.reviews,
        data.image,
        data.is_active
    ))

    conn.commit()
    master_id = cur.lastrowid
    conn.close()

    return {"success": True, "id": master_id}


@app.patch("/admin/masters/{master_id}")
def admin_update_master(
    master_id: int,
    data: MasterUpdate,
    telegram_id: str = Query(...)
):
    require_admin(telegram_id)

    fields = []
    values = []

    mapping = {
        "name": data.name,
        "role": data.role,
        "rating": data.rating,
        "reviews": data.reviews,
        "image": data.image,
        "is_active": data.is_active,
    }

    for key, value in mapping.items():
        if value is not None:
            fields.append(f"{key} = ?")
            values.append(value)

    if not fields:
        return {"success": True}

    values.append(master_id)

    conn = get_conn()

    conn.execute(f"""
        UPDATE masters
        SET {", ".join(fields)}
        WHERE id = ?
    """, values)

    conn.commit()
    conn.close()

    return {"success": True}


@app.delete("/admin/masters/{master_id}")
def admin_delete_master(master_id: int, telegram_id: str = Query(...)):
    require_admin(telegram_id)

    conn = get_conn()
    conn.execute("DELETE FROM masters WHERE id = ?", (master_id,))
    conn.commit()
    conn.close()

    return {"success": True}