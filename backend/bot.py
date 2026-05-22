import os
import asyncio
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.utils.keyboard import InlineKeyboardBuilder

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-mini-app.vercel.app")

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN не найден. Добавь его в .env")

bot = Bot(BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def start(message: types.Message):
    kb = InlineKeyboardBuilder()
    kb.button(
        text="💈 Открыть запись",
        web_app=types.WebAppInfo(url=WEBAPP_URL)
    )

    await message.answer(
        "Добро пожаловать в Legend Barbershop 💈\n\n"
        "Нажми кнопку ниже, чтобы открыть запись.",
        reply_markup=kb.as_markup()
    )


async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())