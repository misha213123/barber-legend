import os
import json
import urllib.request
import sqlite3
from typing import Optional

from fastapi import HTTPException, Query
from pydantic import BaseModel


BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()


class ReviewCreate(BaseModel):
    booking_id: int
    telegram_id: str
    rating: int
    comment: Optional[str] = ""


class BroadcastCreate(BaseModel):
    text: str


def register_reviews_stats_features(app, get_conn, require_admin, ADMIN_IDS):
    def ensure_tables():
        conn = get_conn()

        conn.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER NOT NULL UNIQUE,
            telegram_id TEXT NOT NULL,
            master TEXT NOT NULL,
            service TEXT DEFAULT '',
            rating INTEGER NOT NULL,
            comment TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """)

        conn.execute("""
        CREATE TABLE IF NOT EXISTS broadcasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            sent_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """)

        conn.commit()
        conn.close()

        recalc_all_master_ratings()

    def recalc_master_rating(master_name: str):
        conn = get_conn()

        row = conn.execute("""
            SELECT COUNT(*) as cnt, AVG(rating) as avg_rating
            FROM reviews
            WHERE master = ?
        """, (master_name,)).fetchone()

        count = int(row["cnt"] or 0)
        avg_rating = float(row["avg_rating"] or 0)

        rating_text = f"{avg_rating:.1f}" if count > 0 else "0.0"

        conn.execute("""
            UPDATE masters
            SET rating = ?, reviews = ?
            WHERE name = ?
        """, (rating_text, count, master_name))

        conn.commit()
        conn.close()

    def recalc_all_master_ratings():
        conn = get_conn()
        masters = conn.execute("SELECT name FROM masters").fetchall()
        conn.close()

        for master in masters:
            recalc_master_rating(master["name"])

    def review_to_dict(row):
        return {
            "id": row["id"],
            "booking_id": row["booking_id"],
            "telegram_id": row["telegram_id"],
            "master": row["master"],
            "service": row["service"],
            "rating": row["rating"],
            "comment": row["comment"],
            "created_at": row["created_at"],
        }

    def send_telegram_message(chat_id: str, text: str) -> bool:
        if not BOT_TOKEN:
            return False

        try:
            url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
            payload = json.dumps({
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML"
            }).encode("utf-8")

            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=8) as response:
                return response.status == 200
        except Exception:
            return False

    ensure_tables()

    @app.get("/reviews")
    def get_reviews(master: Optional[str] = None, limit: int = 50):
        conn = get_conn()

        if master:
            rows = conn.execute("""
                SELECT * FROM reviews
                WHERE master = ?
                ORDER BY id DESC
                LIMIT ?
            """, (master, limit)).fetchall()
        else:
            rows = conn.execute("""
                SELECT * FROM reviews
                ORDER BY id DESC
                LIMIT ?
            """, (limit,)).fetchall()

        conn.close()
        return [review_to_dict(row) for row in rows]

    @app.get("/reviews/my")
    def get_my_reviews(telegram_id: str):
        conn = get_conn()
        rows = conn.execute("""
            SELECT * FROM reviews
            WHERE telegram_id = ?
            ORDER BY id DESC
        """, (str(telegram_id),)).fetchall()
        conn.close()
        return [review_to_dict(row) for row in rows]

    @app.post("/reviews")
    def create_review(data: ReviewCreate):
        rating = int(data.rating)

        if rating < 1 or rating > 5:
            raise HTTPException(status_code=400, detail="Оценка должна быть от 1 до 5")

        conn = get_conn()

        booking = conn.execute("""
            SELECT * FROM bookings
            WHERE id = ? AND telegram_id = ?
        """, (data.booking_id, str(data.telegram_id))).fetchone()

        if not booking:
            conn.close()
            raise HTTPException(status_code=404, detail="Запись не найдена")

        if booking["status"] != "Выполнена":
            conn.close()
            raise HTTPException(status_code=400, detail="Отзыв можно оставить только после выполненной записи")

        exists = conn.execute("""
            SELECT id FROM reviews
            WHERE booking_id = ?
        """, (data.booking_id,)).fetchone()

        if exists:
            conn.close()
            raise HTTPException(status_code=400, detail="Отзыв уже оставлен")

        conn.execute("""
            INSERT INTO reviews (
                booking_id, telegram_id, master, service, rating, comment
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            data.booking_id,
            str(data.telegram_id),
            booking["master"],
            booking["service"],
            rating,
            data.comment or ""
        ))

        conn.commit()
        conn.close()

        recalc_master_rating(booking["master"])

        return {"success": True}

    @app.get("/admin/stats")
    def admin_stats(telegram_id: str = Query(...)):
        require_admin(telegram_id)

        conn = get_conn()

        total_bookings = conn.execute("SELECT COUNT(*) FROM bookings").fetchone()[0]
        done_bookings = conn.execute("SELECT COUNT(*) FROM bookings WHERE status = 'Выполнена'").fetchone()[0]
        active_clients = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        total_reviews = conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]

        revenue_row = conn.execute("""
            SELECT COALESCE(SUM(price), 0)
            FROM bookings
            WHERE status = 'Выполнена'
        """).fetchone()

        revenue = int(revenue_row[0] or 0)

        top_services = conn.execute("""
            SELECT service, COUNT(*) as count, COALESCE(SUM(price), 0) as revenue
            FROM bookings
            WHERE status != 'Отменена'
            GROUP BY service
            ORDER BY count DESC
            LIMIT 5
        """).fetchall()

        top_masters = conn.execute("""
            SELECT master, COUNT(*) as count, COALESCE(SUM(price), 0) as revenue
            FROM bookings
            WHERE status != 'Отменена'
            GROUP BY master
            ORDER BY count DESC
            LIMIT 5
        """).fetchall()

        recent_reviews = conn.execute("""
            SELECT * FROM reviews
            ORDER BY id DESC
            LIMIT 5
        """).fetchall()

        conn.close()

        return {
            "total_bookings": total_bookings,
            "done_bookings": done_bookings,
            "active_clients": active_clients,
            "total_reviews": total_reviews,
            "revenue": revenue,
            "top_services": [dict(row) for row in top_services],
            "top_masters": [dict(row) for row in top_masters],
            "recent_reviews": [review_to_dict(row) for row in recent_reviews],
        }

    @app.post("/admin/broadcast")
    def admin_broadcast(data: BroadcastCreate, telegram_id: str = Query(...)):
        require_admin(telegram_id)

        text = str(data.text or "").strip()

        if not text:
            raise HTTPException(status_code=400, detail="Текст рассылки пустой")

        conn = get_conn()
        users = conn.execute("""
            SELECT telegram_id FROM users
            WHERE telegram_id IS NOT NULL AND telegram_id != ''
        """).fetchall()

        sent = 0
        failed = 0

        for user in users:
            ok = send_telegram_message(str(user["telegram_id"]), text)
            if ok:
                sent += 1
            else:
                failed += 1

        conn.execute("""
            INSERT INTO broadcasts (text, sent_count, failed_count)
            VALUES (?, ?, ?)
        """, (text, sent, failed))

        conn.commit()
        conn.close()

        return {
            "success": True,
            "sent": sent,
            "failed": failed,
            "bot_token_enabled": bool(BOT_TOKEN),
        }

    @app.get("/admin/broadcasts")
    def admin_broadcasts(telegram_id: str = Query(...)):
        require_admin(telegram_id)

        conn = get_conn()
        rows = conn.execute("""
            SELECT * FROM broadcasts
            ORDER BY id DESC
            LIMIT 30
        """).fetchall()
        conn.close()

        return [dict(row) for row in rows]