
import os
import sqlite3
from datetime import date, datetime
from typing import Optional, List

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

ADMIN_IDS = [x.strip() for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip()]

DB_PATH = "bookings.db"
DEFAULT_WORK_START = "09:00"
DEFAULT_WORK_END = "20:00"
DEFAULT_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
VALID_STATUSES = ["Новая", "Подтверждена", "Выполнена", "Отменена"]


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def is_admin(telegram_id: str) -> bool:
    telegram_id = str(telegram_id)

    if telegram_id in ADMIN_IDS:
        return True

    conn = get_conn()
    row = conn.execute(
        "SELECT id FROM app_admins WHERE telegram_id = ? AND is_active = 1",
        (telegram_id,),
    ).fetchone()
    conn.close()

    return row is not None


def normalize_username(username: str) -> str:
    return str(username or "").strip().lstrip("@").lower()

def require_admin(telegram_id: str):
    if not is_admin(telegram_id):
        raise HTTPException(status_code=403, detail="Not admin")


def column_exists(conn, table: str, column: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(row["name"] == column for row in rows)


def parse_iso_date(value: str) -> Optional[date]:
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except Exception:
        return None


def day_label_from_date(value: str) -> str:
    parsed = parse_iso_date(value)
    if not parsed:
        return "Пн"
    return DEFAULT_DAYS[parsed.weekday()]


def validate_not_past(value: str):
    parsed = parse_iso_date(value)
    if parsed and parsed < date.today():
        raise HTTPException(status_code=400, detail="Нельзя записаться на прошедшую дату")


def ensure_master_hours(conn, master_id: int):
    existing = conn.execute("SELECT day_label FROM master_hours WHERE master_id = ?", (master_id,)).fetchall()
    existing_labels = {row["day_label"] for row in existing}

    for day in DEFAULT_DAYS:
        if day not in existing_labels:
            is_working = 0 if day == "Вс" else 1
            conn.execute(
                """
                INSERT INTO master_hours (master_id, day_label, start_time, end_time, is_working)
                VALUES (?, ?, ?, ?, ?)
                """,
                (master_id, day, DEFAULT_WORK_START, DEFAULT_WORK_END, is_working),
            )


def init_db():
    conn = get_conn()

    conn.execute(
        """
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
        """
    )

    conn.execute(
        """
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
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS masters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT DEFAULT '',
            rating TEXT DEFAULT '5.0',
            reviews INTEGER DEFAULT 0,
            image TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS work_photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image TEXT NOT NULL,
            title TEXT DEFAULT '',
            master TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS master_hours (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            master_id INTEGER NOT NULL,
            day_label TEXT NOT NULL,
            start_time TEXT DEFAULT '09:00',
            end_time TEXT DEFAULT '20:00',
            is_working INTEGER DEFAULT 1,
            UNIQUE(master_id, day_label)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS shop_closed_days (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            reason TEXT DEFAULT '',
            is_closed INTEGER DEFAULT 1
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS master_day_offs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            master_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            reason TEXT DEFAULT '',
            is_off INTEGER DEFAULT 1,
            UNIQUE(master_id, date)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT NOT NULL UNIQUE,
            username TEXT DEFAULT '',
            username_norm TEXT DEFAULT '',
            first_name TEXT DEFAULT '',
            last_seen TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS app_admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT NOT NULL UNIQUE,
            username TEXT DEFAULT '',
            username_norm TEXT DEFAULT '',
            first_name TEXT DEFAULT '',
            granted_by TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    if not column_exists(conn, "users", "username_norm"):
        conn.execute("ALTER TABLE users ADD COLUMN username_norm TEXT DEFAULT ''")

    if not column_exists(conn, "app_admins", "username_norm"):
        conn.execute("ALTER TABLE app_admins ADD COLUMN username_norm TEXT DEFAULT ''")



    if not column_exists(conn, "work_photos", "master"):
        conn.execute("ALTER TABLE work_photos ADD COLUMN master TEXT DEFAULT ''")

    services_count = conn.execute("SELECT COUNT(*) FROM services").fetchone()[0]
    masters_count = conn.execute("SELECT COUNT(*) FROM masters").fetchone()[0]
    photos_count = conn.execute("SELECT COUNT(*) FROM work_photos").fetchone()[0]

    if services_count == 0:
        default_services = [
            ("Стрижка", "Классическая мужская стрижка с укладкой", 45, 120, "✂️", "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=600&auto=format&fit=crop", 1),
            ("Стрижка + борода", "Стрижка и оформление бороды", 60, 160, "🧔", "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&auto=format&fit=crop", 1),
            ("Королевское бритьё", "Бритьё опасной бритвой + уход", 40, 110, "🪒", "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600&auto=format&fit=crop", 1),
            ("Детская стрижка", "Стрижка для детей до 12 лет", 30, 90, "👦", "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=600&auto=format&fit=crop", 1),
        ]
        conn.executemany(
            """
            INSERT INTO services (name, description, duration, price, icon, image, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            default_services,
        )

    if masters_count == 0:
        default_masters = [
            ("Алексей", "Топ-барбер", "4.9", 243, "https://images.unsplash.com/photo-1618077360395-f3068be8e001?q=80&w=300&auto=format&fit=crop", 1),
            ("Дмитрий", "Барбер", "4.8", 165, "https://images.unsplash.com/photo-1622286346003-c2e63b378f17?q=80&w=300&auto=format&fit=crop", 1),
            ("Максим", "Барбер", "4.9", 112, "https://images.unsplash.com/photo-1590086783191-a0694c7d1e6e?q=80&w=300&auto=format&fit=crop", 1),
            ("Игорь", "Барбер", "4.7", 98, "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop", 1),
        ]
        conn.executemany(
            """
            INSERT INTO masters (name, role, rating, reviews, image, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            default_masters,
        )

    if photos_count == 0:
        default_photos = [
            ("https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=700&auto=format&fit=crop", "Fade cut", "", 1),
            ("https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=700&auto=format&fit=crop", "Beard style", "", 1),
            ("https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=700&auto=format&fit=crop", "Classic cut", "", 1),
        ]
        conn.executemany(
            """
            INSERT INTO work_photos (image, title, master, is_active)
            VALUES (?, ?, ?, ?)
            """,
            default_photos,
        )

    for row in conn.execute("SELECT id FROM masters").fetchall():
        ensure_master_hours(conn, row["id"])

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


class BookingReschedule(BaseModel):
    date: str
    time: str


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


class WorkPhotoCreate(BaseModel):
    image: str
    title: Optional[str] = ""
    master: Optional[str] = ""
    is_active: int = 1


class WorkPhotoUpdate(BaseModel):
    image: Optional[str] = None
    title: Optional[str] = None
    master: Optional[str] = None
    is_active: Optional[int] = None


class MasterHourUpdate(BaseModel):
    day_label: str
    start_time: str = DEFAULT_WORK_START
    end_time: str = DEFAULT_WORK_END
    is_working: int = 1


class MasterHoursUpdate(BaseModel):
    hours: List[MasterHourUpdate]


class ClosedDayUpdate(BaseModel):
    date: str
    reason: Optional[str] = ""
    is_closed: int = 1


class MasterDayOffUpdate(BaseModel):
    date: str
    reason: Optional[str] = ""
    is_off: int = 1


class AppAdminByUsername(BaseModel):
    username: str

def upsert_user(conn, telegram_id: str, username: str = "", first_name: str = ""):
    telegram_id = str(telegram_id)
    username = str(username or "").strip().lstrip("@")
    username_norm = normalize_username(username)
    first_name = str(first_name or "").strip()

    conn.execute(
        """
        INSERT INTO users (telegram_id, username, username_norm, first_name, last_seen)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(telegram_id) DO UPDATE SET
            username = excluded.username,
            username_norm = excluded.username_norm,
            first_name = excluded.first_name,
            last_seen = CURRENT_TIMESTAMP
        """,
        (telegram_id, username, username_norm, first_name),
    )


def app_admin_to_dict(row):
    return {
        "telegram_id": row["telegram_id"],
        "username": row["username"],
        "first_name": row["first_name"],
        "granted_by": row["granted_by"],
        "is_active": row["is_active"],
        "created_at": row["created_at"],
        "is_super_admin": str(row["telegram_id"]) in ADMIN_IDS,
    }

def booking_to_dict(row):
    return dict(row)


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


def work_photo_to_dict(row):
    return {"id": row["id"], "image": row["image"], "img": row["image"], "title": row["title"], "master": row["master"], "is_active": row["is_active"]}


def master_hour_to_dict(row):
    return {"id": row["id"], "master_id": row["master_id"], "day_label": row["day_label"], "start_time": row["start_time"], "end_time": row["end_time"], "is_working": row["is_working"]}


def closed_day_to_dict(row):
    return {"id": row["id"], "date": row["date"], "reason": row["reason"], "is_closed": row["is_closed"]}


def master_day_off_to_dict(row):
    return {"id": row["id"], "master_id": row["master_id"], "date": row["date"], "reason": row["reason"], "is_off": row["is_off"]}


def validate_status(status: str):
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Wrong status")


def is_shop_closed(conn, booking_date: str) -> bool:
    row = conn.execute("SELECT is_closed FROM shop_closed_days WHERE date = ?", (booking_date,)).fetchone()
    return bool(row and int(row["is_closed"]) == 1)


def get_master_row_by_name(conn, master_name: str):
    return conn.execute("SELECT * FROM masters WHERE name = ?", (master_name,)).fetchone()


def is_master_day_off(conn, master_id: int, booking_date: str) -> bool:
    row = conn.execute("SELECT is_off FROM master_day_offs WHERE master_id = ? AND date = ?", (master_id, booking_date)).fetchone()
    return bool(row and int(row["is_off"]) == 1)


def time_to_minutes(value: str) -> int:
    try:
        h, m = str(value).split(":")
        return int(h) * 60 + int(m)
    except Exception:
        return 0


def check_working_rules(conn, master_name: str, booking_date: str, booking_time: str):
    validate_not_past(booking_date)

    if is_shop_closed(conn, booking_date):
        raise HTTPException(status_code=409, detail="Заведение закрыто в этот день")

    master = get_master_row_by_name(conn, master_name)
    if not master:
        return

    ensure_master_hours(conn, master["id"])

    if is_master_day_off(conn, master["id"], booking_date):
        raise HTTPException(status_code=409, detail="У мастера выходной в этот день")

    day_label = day_label_from_date(booking_date)
    hours = conn.execute(
        "SELECT * FROM master_hours WHERE master_id = ? AND day_label = ?",
        (master["id"], day_label),
    ).fetchone()

    if hours and int(hours["is_working"]) != 1:
        raise HTTPException(status_code=409, detail="Мастер не работает в этот день")

    if hours:
        current = time_to_minutes(booking_time)
        start = time_to_minutes(hours["start_time"])
        end = time_to_minutes(hours["end_time"])
        if current < start or current > end:
            raise HTTPException(status_code=409, detail="Время вне графика мастера")


def check_slot_available(conn, master: str, booking_date: str, booking_time: str, exclude_booking_id: Optional[int] = None):
    check_working_rules(conn, master, booking_date, booking_time)

    if exclude_booking_id is None:
        exists = conn.execute(
            """
            SELECT id FROM bookings
            WHERE master = ? AND date = ? AND time = ? AND status != 'Отменена'
            """,
            (master, booking_date, booking_time),
        ).fetchone()
    else:
        exists = conn.execute(
            """
            SELECT id FROM bookings
            WHERE master = ? AND date = ? AND time = ? AND status != 'Отменена' AND id != ?
            """,
            (master, booking_date, booking_time, exclude_booking_id),
        ).fetchone()

    if exists:
        raise HTTPException(status_code=409, detail="Это время уже занято")


@app.get("/")
def root():
    return {"status": "ok", "app": "Legend Barbershop", "admins": len(ADMIN_IDS)}


@app.get("/me/admin")
def check_admin(telegram_id: str, username: str = "", first_name: str = ""):
    conn = get_conn()
    upsert_user(conn, telegram_id, username, first_name)
    conn.commit()
    conn.close()

    return {"is_admin": is_admin(telegram_id), "telegram_id": telegram_id}


@app.get("/admin/app-admins")
def admin_get_app_admins(telegram_id: str = Query(...)):
    require_admin(telegram_id)

    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM app_admins WHERE is_active = 1 ORDER BY id DESC"
    ).fetchall()
    conn.close()

    env_admins = [
        {
            "telegram_id": admin_id,
            "username": "",
            "first_name": "Главный админ из Render ADMIN_IDS",
            "granted_by": "ENV",
            "is_active": 1,
            "created_at": "",
            "is_super_admin": True,
        }
        for admin_id in ADMIN_IDS
    ]

    return env_admins + [
        app_admin_to_dict(row)
        for row in rows
        if str(row["telegram_id"]) not in ADMIN_IDS
    ]


@app.post("/admin/app-admins/by-username")
def admin_add_app_admin_by_username(data: AppAdminByUsername, telegram_id: str = Query(...)):
    require_admin(telegram_id)

    username_norm = normalize_username(data.username)

    if not username_norm:
        raise HTTPException(status_code=400, detail="Укажи username")

    conn = get_conn()

    user_row = conn.execute(
        "SELECT * FROM users WHERE username_norm = ? ORDER BY last_seen DESC LIMIT 1",
        (username_norm,),
    ).fetchone()

    if not user_row:
        conn.close()
        raise HTTPException(
            status_code=404,
            detail="Пользователь с таким @username ещё не открывал Mini App. Пусть зайдёт в приложение один раз.",
        )

    conn.execute(
        """
        INSERT INTO app_admins (telegram_id, username, username_norm, first_name, granted_by, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
        ON CONFLICT(telegram_id) DO UPDATE SET
            username = excluded.username,
            username_norm = excluded.username_norm,
            first_name = excluded.first_name,
            granted_by = excluded.granted_by,
            is_active = 1
        """,
        (
            user_row["telegram_id"],
            user_row["username"],
            user_row["username_norm"],
            user_row["first_name"],
            str(telegram_id),
        ),
    )

    conn.commit()
    conn.close()

    return {
        "success": True,
        "telegram_id": user_row["telegram_id"],
        "username": user_row["username"],
    }


@app.delete("/admin/app-admins/{target_telegram_id}")
def admin_remove_app_admin(target_telegram_id: str, telegram_id: str = Query(...)):
    require_admin(telegram_id)

    if str(target_telegram_id) in ADMIN_IDS:
        raise HTTPException(
            status_code=400,
            detail="Главного админа из Render ADMIN_IDS нельзя удалить из приложения",
        )

    if str(target_telegram_id) == str(telegram_id):
        raise HTTPException(
            status_code=400,
            detail="Нельзя снять админку самому себе",
        )

    conn = get_conn()
    conn.execute(
        "UPDATE app_admins SET is_active = 0 WHERE telegram_id = ?",
        (str(target_telegram_id),),
    )
    conn.commit()
    conn.close()

    return {"success": True}


@app.get("/services")
def get_services(include_inactive: int = 0):
    conn = get_conn()
    rows = conn.execute("SELECT * FROM services ORDER BY id DESC" if include_inactive else "SELECT * FROM services WHERE is_active = 1 ORDER BY id DESC").fetchall()
    conn.close()
    return [service_to_dict(row) for row in rows]


@app.get("/masters")
def get_masters(include_inactive: int = 0):
    conn = get_conn()
    rows = conn.execute("SELECT * FROM masters ORDER BY id DESC" if include_inactive else "SELECT * FROM masters WHERE is_active = 1 ORDER BY id DESC").fetchall()
    conn.close()
    return [master_to_dict(row) for row in rows]


@app.get("/work-photos")
def get_work_photos(include_inactive: int = 0):
    conn = get_conn()
    rows = conn.execute("SELECT * FROM work_photos ORDER BY id DESC" if include_inactive else "SELECT * FROM work_photos WHERE is_active = 1 ORDER BY id DESC").fetchall()
    conn.close()
    return [work_photo_to_dict(row) for row in rows]


@app.get("/shop-closed-days")
def get_shop_closed_days(start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_conn()
    if start_date and end_date:
        rows = conn.execute("SELECT * FROM shop_closed_days WHERE date >= ? AND date <= ? AND is_closed = 1 ORDER BY date", (start_date, end_date)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM shop_closed_days WHERE is_closed = 1 ORDER BY date").fetchall()
    conn.close()
    return [closed_day_to_dict(row) for row in rows]


@app.get("/master-day-offs")
def get_master_day_offs(master: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_conn()
    master_row = get_master_row_by_name(conn, master)
    if not master_row:
        conn.close()
        return []
    if start_date and end_date:
        rows = conn.execute("SELECT * FROM master_day_offs WHERE master_id = ? AND date >= ? AND date <= ? AND is_off = 1 ORDER BY date", (master_row["id"], start_date, end_date)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM master_day_offs WHERE master_id = ? AND is_off = 1 ORDER BY date", (master_row["id"],)).fetchall()
    conn.close()
    return [master_day_off_to_dict(row) for row in rows]


@app.post("/bookings")
def create_booking(data: BookingCreate):
    conn = get_conn()
    check_slot_available(conn, data.master, data.date, data.time)
    cur = conn.execute(
        """
        INSERT INTO bookings (telegram_id, username, first_name, service, master, date, time, price, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (data.telegram_id, data.username, data.first_name, data.service, data.master, data.date, data.time, data.price, "Новая"),
    )
    conn.commit()
    booking_id = cur.lastrowid
    conn.close()
    return {"success": True, "booking_id": booking_id}


@app.get("/bookings/{telegram_id}")
def get_my_bookings(telegram_id: str):
    conn = get_conn()
    rows = conn.execute("SELECT * FROM bookings WHERE telegram_id = ? ORDER BY id DESC", (telegram_id,)).fetchall()
    conn.close()
    return [booking_to_dict(row) for row in rows]


@app.patch("/bookings/{booking_id}/cancel")
def cancel_my_booking(booking_id: int, telegram_id: str = Query(...)):
    conn = get_conn()
    booking = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
    if not booking:
        conn.close()
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking["telegram_id"]) != str(telegram_id):
        conn.close()
        raise HTTPException(status_code=403, detail="Not your booking")
    if booking["status"] in ["Выполнена", "Отменена"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Эту запись уже нельзя отменить")
    conn.execute("UPDATE bookings SET status = 'Отменена' WHERE id = ?", (booking_id,))
    conn.commit()
    conn.close()
    return {"success": True}


@app.patch("/bookings/{booking_id}/reschedule")
def reschedule_my_booking(booking_id: int, data: BookingReschedule, telegram_id: str = Query(...)):
    conn = get_conn()
    booking = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
    if not booking:
        conn.close()
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking["telegram_id"]) != str(telegram_id):
        conn.close()
        raise HTTPException(status_code=403, detail="Not your booking")
    if booking["status"] in ["Выполнена", "Отменена"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Эту запись уже нельзя перенести")
    check_slot_available(conn, booking["master"], data.date, data.time, booking_id)
    conn.execute("UPDATE bookings SET date = ?, time = ?, status = 'Новая' WHERE id = ?", (data.date, data.time, booking_id))
    conn.commit()
    conn.close()
    return {"success": True}


@app.get("/admin/bookings")
def admin_bookings(telegram_id: str = Query(...)):
    require_admin(telegram_id)
    conn = get_conn()
    rows = conn.execute("SELECT * FROM bookings ORDER BY id DESC").fetchall()
    conn.close()
    return [booking_to_dict(row) for row in rows]


@app.patch("/admin/bookings/{booking_id}/status")
def update_booking_status(booking_id: int, data: StatusUpdate, telegram_id: str = Query(...)):
    require_admin(telegram_id)
    validate_status(data.status)
    conn = get_conn()
    conn.execute("UPDATE bookings SET status = ? WHERE id = ?", (data.status, booking_id))
    conn.commit()
    conn.close()
    return {"success": True}


@app.get("/slots/busy")
def busy_slots(master: str, date: str):
    conn = get_conn()
    rows = conn.execute("SELECT time FROM bookings WHERE master = ? AND date = ? AND status != 'Отменена'", (master, date)).fetchall()
    conn.close()
    return [row["time"] for row in rows]


@app.get("/master-hours")
def get_public_master_hours(master: str, day_label: str):
    conn = get_conn()
    master_row = get_master_row_by_name(conn, master)
    if not master_row:
        conn.close()
        return {"day_label": day_label, "start_time": DEFAULT_WORK_START, "end_time": DEFAULT_WORK_END, "is_working": 1}
    ensure_master_hours(conn, master_row["id"])
    conn.commit()
    row = conn.execute("SELECT * FROM master_hours WHERE master_id = ? AND day_label = ?", (master_row["id"], day_label)).fetchone()
    conn.close()
    return master_hour_to_dict(row) if row else {"day_label": day_label, "start_time": DEFAULT_WORK_START, "end_time": DEFAULT_WORK_END, "is_working": 1}


@app.post("/admin/services")
def admin_create_service(data: ServiceCreate, telegram_id: str = Query(...)):
    require_admin(telegram_id)
    conn = get_conn()
    cur = conn.execute("INSERT INTO services (name, description, duration, price, icon, image, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)", (data.name, data.description, data.duration, data.price, data.icon, data.image, data.is_active))
    conn.commit()
    service_id = cur.lastrowid
    conn.close()
    return {"success": True, "id": service_id}


@app.patch("/admin/services/{service_id}")
def admin_update_service(service_id: int, data: ServiceUpdate, telegram_id: str = Query(...)):
    require_admin(telegram_id)
    fields = []
    values = []
    mapping = {"name": data.name, "description": data.description, "duration": data.duration, "price": data.price, "icon": data.icon, "image": data.image, "is_active": data.is_active}
    for key, value in mapping.items():
        if value is not None:
            fields.append(f"{key} = ?")
            values.append(value)
    if not fields:
        return {"success": True}
    values.append(service_id)
    conn = get_conn()
    conn.execute(f"UPDATE services SET {', '.join(fields)} WHERE id = ?", values)
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
    cur = conn.execute("INSERT INTO masters (name, role, rating, reviews, image, is_active) VALUES (?, ?, ?, ?, ?, ?)", (data.name, data.role, data.rating, data.reviews, data.image, data.is_active))
    master_id = cur.lastrowid
    ensure_master_hours(conn, master_id)
    conn.commit()
    conn.close()
    return {"success": True, "id": master_id}


@app.patch("/admin/masters/{master_id}")
def admin_update_master(master_id: int, data: MasterUpdate, telegram_id: str = Query(...)):
    require_admin(telegram_id)
    fields = []
    values = []
    mapping = {"name": data.name, "role": data.role, "rating": data.rating, "reviews": data.reviews, "image": data.image, "is_active": data.is_active}
    for key, value in mapping.items():
        if value is not None:
            fields.append(f"{key} = ?")
            values.append(value)
    if not fields:
        return {"success": True}
    values.append(master_id)
    conn = get_conn()
    conn.execute(f"UPDATE masters SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return {"success": True}


@app.delete("/admin/masters/{master_id}")
def admin_delete_master(master_id: int, telegram_id: str = Query(...)):
    require_admin(telegram_id)
    conn = get_conn()
    conn.execute("DELETE FROM master_hours WHERE master_id = ?", (master_id,))
    conn.execute("DELETE FROM master_day_offs WHERE master_id = ?", (master_id,))
    conn.execute("DELETE FROM masters WHERE id = ?", (master_id,))
    conn.commit()
    conn.close()
    return {"success": True}


@app.get("/admin/masters/{master_id}/hours")
def admin_get_master_hours(master_id: int, telegram_id: str = Query(...)):
    require_admin(telegram_id)
    conn = get_conn()
    master = conn.execute("SELECT id FROM masters WHERE id = ?", (master_id,)).fetchone()
    if not master:
        conn.close()
        raise HTTPException(status_code=404, detail="Master not found")
    ensure_master_hours(conn, master_id)
    conn.commit()
    rows = conn.execute("""
        SELECT * FROM master_hours WHERE master_id = ? ORDER BY CASE day_label
            WHEN 'Пн' THEN 1 WHEN 'Вт' THEN 2 WHEN 'Ср' THEN 3 WHEN 'Чт' THEN 4
            WHEN 'Пт' THEN 5 WHEN 'Сб' THEN 6 WHEN 'Вс' THEN 7 ELSE 8 END
    """, (master_id,)).fetchall()
    conn.close()
    return [master_hour_to_dict(row) for row in rows]


@app.patch("/admin/masters/{master_id}/hours")
def admin_update_master_hours(master_id: int, data: MasterHoursUpdate, telegram_id: str = Query(...)):
    require_admin(telegram_id)
    conn = get_conn()
    master = conn.execute("SELECT id FROM masters WHERE id = ?", (master_id,)).fetchone()
    if not master:
        conn.close()
        raise HTTPException(status_code=404, detail="Master not found")
    ensure_master_hours(conn, master_id)
    for item in data.hours:
        if item.day_label not in DEFAULT_DAYS:
            continue
        conn.execute(
            """
            INSERT INTO master_hours (master_id, day_label, start_time, end_time, is_working)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(master_id, day_label) DO UPDATE SET
                start_time = excluded.start_time,
                end_time = excluded.end_time,
                is_working = excluded.is_working
            """,
            (master_id, item.day_label, item.start_time, item.end_time, 1 if int(item.is_working) == 1 else 0),
        )
    conn.commit()
    conn.close()
    return {"success": True}


@app.get("/admin/masters/{master_id}/day-offs")
def admin_get_master_day_offs(master_id: int, telegram_id: str = Query(...), start_date: Optional[str] = None, end_date: Optional[str] = None):
    require_admin(telegram_id)
    conn = get_conn()
    if start_date and end_date:
        rows = conn.execute("SELECT * FROM master_day_offs WHERE master_id = ? AND date >= ? AND date <= ? AND is_off = 1 ORDER BY date", (master_id, start_date, end_date)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM master_day_offs WHERE master_id = ? AND is_off = 1 ORDER BY date", (master_id,)).fetchall()
    conn.close()
    return [master_day_off_to_dict(row) for row in rows]


@app.patch("/admin/masters/{master_id}/day-off")
def admin_set_master_day_off(master_id: int, data: MasterDayOffUpdate, telegram_id: str = Query(...)):
    require_admin(telegram_id)
    validate_not_past(data.date)
    conn = get_conn()
    if int(data.is_off) == 1:
        conn.execute(
            """
            INSERT INTO master_day_offs (master_id, date, reason, is_off)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(master_id, date) DO UPDATE SET reason = excluded.reason, is_off = 1
            """,
            (master_id, data.date, data.reason),
        )
    else:
        conn.execute("DELETE FROM master_day_offs WHERE master_id = ? AND date = ?", (master_id, data.date))
    conn.commit()
    conn.close()
    return {"success": True}


@app.patch("/admin/shop-closed-day")
def admin_set_shop_closed_day(data: ClosedDayUpdate, telegram_id: str = Query(...)):
    require_admin(telegram_id)
    validate_not_past(data.date)
    conn = get_conn()
    if int(data.is_closed) == 1:
        conn.execute(
            """
            INSERT INTO shop_closed_days (date, reason, is_closed)
            VALUES (?, ?, 1)
            ON CONFLICT(date) DO UPDATE SET reason = excluded.reason, is_closed = 1
            """,
            (data.date, data.reason),
        )
    else:
        conn.execute("DELETE FROM shop_closed_days WHERE date = ?", (data.date,))
    conn.commit()
    conn.close()
    return {"success": True}


@app.post("/admin/work-photos")
def admin_create_work_photo(data: WorkPhotoCreate, telegram_id: str = Query(...)):
    require_admin(telegram_id)
    conn = get_conn()
    cur = conn.execute("INSERT INTO work_photos (image, title, master, is_active) VALUES (?, ?, ?, ?)", (data.image, data.title, data.master, data.is_active))
    conn.commit()
    photo_id = cur.lastrowid
    conn.close()
    return {"success": True, "id": photo_id}


@app.patch("/admin/work-photos/{photo_id}")
def admin_update_work_photo(photo_id: int, data: WorkPhotoUpdate, telegram_id: str = Query(...)):
    require_admin(telegram_id)
    fields = []
    values = []
    mapping = {"image": data.image, "title": data.title, "master": data.master, "is_active": data.is_active}
    for key, value in mapping.items():
        if value is not None:
            fields.append(f"{key} = ?")
            values.append(value)
    if not fields:
        return {"success": True}
    values.append(photo_id)
    conn = get_conn()
    conn.execute(f"UPDATE work_photos SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return {"success": True}


@app.delete("/admin/work-photos/{photo_id}")
def admin_delete_work_photo(photo_id: int, telegram_id: str = Query(...)):
    require_admin(telegram_id)
    conn = get_conn()
    conn.execute("DELETE FROM work_photos WHERE id = ?", (photo_id,))
    conn.commit()
    conn.close()
    return {"success": True}
