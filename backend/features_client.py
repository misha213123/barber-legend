from typing import Optional

from fastapi import HTTPException, Query
from pydantic import BaseModel


class FavoriteMasterSave(BaseModel):
    telegram_id: str
    master_id: int


class ReminderSettingsSave(BaseModel):
    telegram_id: str
    reminders_enabled: int = 1


def register_client_features(app, get_conn, require_admin):
    def ensure_tables():
        conn = get_conn()

        conn.execute("""
        CREATE TABLE IF NOT EXISTS favorite_masters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT NOT NULL UNIQUE,
            master_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """)

        conn.execute("""
        CREATE TABLE IF NOT EXISTS reminder_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT NOT NULL UNIQUE,
            reminders_enabled INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """)

        conn.commit()
        conn.close()

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

    ensure_tables()

    @app.get("/client/summary")
    def client_summary(telegram_id: str):
        conn = get_conn()

        profile = conn.execute("""
            SELECT * FROM users
            WHERE telegram_id = ?
        """, (str(telegram_id),)).fetchone()

        total_visits = conn.execute("""
            SELECT COUNT(*) FROM bookings
            WHERE telegram_id = ? AND status = 'Выполнена'
        """, (str(telegram_id),)).fetchone()[0]

        total_spent = conn.execute("""
            SELECT COALESCE(SUM(price), 0) FROM bookings
            WHERE telegram_id = ? AND status = 'Выполнена'
        """, (str(telegram_id),)).fetchone()[0]

        last_booking = conn.execute("""
            SELECT * FROM bookings
            WHERE telegram_id = ? AND status != 'Отменена'
            ORDER BY id DESC
            LIMIT 1
        """, (str(telegram_id),)).fetchone()

        favorite = conn.execute("""
            SELECT m.*
            FROM favorite_masters fm
            JOIN masters m ON m.id = fm.master_id
            WHERE fm.telegram_id = ?
            LIMIT 1
        """, (str(telegram_id),)).fetchone()

        reviews_count = conn.execute("""
            SELECT COUNT(*) FROM reviews
            WHERE telegram_id = ?
        """, (str(telegram_id),)).fetchone()[0]

        reminder = conn.execute("""
            SELECT reminders_enabled FROM reminder_settings
            WHERE telegram_id = ?
        """, (str(telegram_id),)).fetchone()

        conn.close()

        level = "Bronze"
        discount = 0

        if total_visits >= 15:
            level = "Legend"
            discount = 20
        elif total_visits >= 10:
            level = "Gold"
            discount = 15
        elif total_visits >= 5:
            level = "Silver"
            discount = 10

        next_level_visits = 5
        if total_visits >= 5:
            next_level_visits = 10
        if total_visits >= 10:
            next_level_visits = 15
        if total_visits >= 15:
            next_level_visits = total_visits

        return {
            "profile": dict(profile) if profile else None,
            "total_visits": total_visits,
            "total_spent": int(total_spent or 0),
            "reviews_count": reviews_count,
            "level": level,
            "discount": discount,
            "next_level_visits": next_level_visits,
            "last_booking": dict(last_booking) if last_booking else None,
            "favorite_master": master_to_dict(favorite) if favorite else None,
            "reminders_enabled": int(reminder["reminders_enabled"]) if reminder else 1,
        }

    @app.get("/client/favorite-master")
    def get_favorite_master(telegram_id: str):
        conn = get_conn()

        row = conn.execute("""
            SELECT m.*
            FROM favorite_masters fm
            JOIN masters m ON m.id = fm.master_id
            WHERE fm.telegram_id = ?
            LIMIT 1
        """, (str(telegram_id),)).fetchone()

        conn.close()

        if not row:
            return None

        return master_to_dict(row)

    @app.post("/client/favorite-master")
    def save_favorite_master(data: FavoriteMasterSave):
        conn = get_conn()

        master = conn.execute("""
            SELECT id FROM masters
            WHERE id = ? AND is_active = 1
        """, (data.master_id,)).fetchone()

        if not master:
            conn.close()
            raise HTTPException(status_code=404, detail="Мастер не найден")

        conn.execute("""
            INSERT INTO favorite_masters (telegram_id, master_id)
            VALUES (?, ?)
            ON CONFLICT(telegram_id) DO UPDATE SET
                master_id = excluded.master_id,
                created_at = CURRENT_TIMESTAMP
        """, (str(data.telegram_id), data.master_id))

        conn.commit()
        conn.close()

        return {"success": True}

    @app.delete("/client/favorite-master")
    def delete_favorite_master(telegram_id: str):
        conn = get_conn()
        conn.execute("""
            DELETE FROM favorite_masters
            WHERE telegram_id = ?
        """, (str(telegram_id),))
        conn.commit()
        conn.close()

        return {"success": True}

    @app.get("/client/history")
    def client_history(telegram_id: str):
        conn = get_conn()

        bookings = conn.execute("""
            SELECT * FROM bookings
            WHERE telegram_id = ?
            ORDER BY id DESC
        """, (str(telegram_id),)).fetchall()

        reviews = conn.execute("""
            SELECT * FROM reviews
            WHERE telegram_id = ?
            ORDER BY id DESC
        """, (str(telegram_id),)).fetchall()

        conn.close()

        return {
            "bookings": [dict(row) for row in bookings],
            "reviews": [dict(row) for row in reviews],
        }

    @app.post("/client/reminders")
    def save_reminder_settings(data: ReminderSettingsSave):
        conn = get_conn()

        conn.execute("""
            INSERT INTO reminder_settings (telegram_id, reminders_enabled)
            VALUES (?, ?)
            ON CONFLICT(telegram_id) DO UPDATE SET
                reminders_enabled = excluded.reminders_enabled,
                created_at = CURRENT_TIMESTAMP
        """, (str(data.telegram_id), int(data.reminders_enabled)))

        conn.commit()
        conn.close()

        return {"success": True}

    @app.get("/client/reminders")
    def get_reminder_settings(telegram_id: str):
        conn = get_conn()

        row = conn.execute("""
            SELECT reminders_enabled FROM reminder_settings
            WHERE telegram_id = ?
        """, (str(telegram_id),)).fetchone()

        conn.close()

        return {
            "telegram_id": str(telegram_id),
            "reminders_enabled": int(row["reminders_enabled"]) if row else 1,
        }