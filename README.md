# Legend Barbershop Telegram Mini App

Полный стартовый проект для барбершопа: Mini App в стиле dark luxury, онлайн-запись, админ-панель, база и Telegram bot.

## Что добавлено в этой версии
- premium dark luxury UI;
- анимации карточек, кнопок, появления экранов;
- модальные окна;
- подтверждение записи;
- раздел «Мои записи»;
- админ-панель: записи, клиенты, доход, услуги, рассылка;
- изменение статусов записей: новая / подтверждена / выполнена / отменена;
- Telegram WebApp SDK: expand, цвета, haptic feedback;
- skeleton loading.

## Запуск backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

API будет здесь:
```text
http://localhost:8000
```

## Запуск frontend
Открой `frontend/index.html` через Live Server в VS Code.

Для подключения другого API можно в браузере выполнить:
```js
localStorage.setItem('API_URL', 'https://your-backend.onrender.com')
```

## Telegram Mini App
1. Загрузи frontend на Vercel/Netlify.
2. Загрузи backend на Render/Railway.
3. В BotFather вставь HTTPS-ссылку Mini App в Menu Button.
4. В `backend/bot.py` укажи BOT_TOKEN и WEBAPP_URL.
