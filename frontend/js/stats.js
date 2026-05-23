async function adminStats() {
  try {
    const stats = await api(`/admin/stats?telegram_id=${encodeURIComponent(user.id)}`);

    app.innerHTML = `
      <div class="screen">
        <div class="header">
          <div class="back" onclick="home()">←</div>
          <h2>Статистика</h2>
        </div>

        ${adminMainTabs()}

        <div class="admin-grid">
          <div class="stat"><strong>${stats.revenue} zł</strong><span>Доход</span></div>
          <div class="stat"><strong>${stats.total_bookings}</strong><span>Записей</span></div>
          <div class="stat"><strong>${stats.active_clients}</strong><span>Клиентов</span></div>
        </div>

        <div class="details">
          <h3>Топ услуг</h3>
          ${stats.top_services.length ? stats.top_services.map(s => `
            <div class="stat-row">
              <span>${s.service}</span>
              <b>${s.count} · ${s.revenue} zł</b>
            </div>
          `).join("") : `<p class="muted">Пока нет данных</p>`}
        </div>

        <div class="details">
          <h3>Топ мастеров</h3>
          ${stats.top_masters.length ? stats.top_masters.map(m => `
            <div class="stat-row">
              <span>${m.master}</span>
              <b>${m.count} · ${m.revenue} zł</b>
            </div>
          `).join("") : `<p class="muted">Пока нет данных</p>`}
        </div>

        <div class="details">
          <h3>Последние отзывы</h3>
          ${stats.recent_reviews.length ? stats.recent_reviews.map(r => `
            <div class="review-mini">
              <div>${starsHtml(r.rating)}</div>
              <p>${r.comment || "Без комментария"}</p>
              <small>${r.master} · ${r.service}</small>
            </div>
          `).join("") : `<p class="muted">Отзывов пока нет</p>`}
        </div>

        ${await nav("admin")}
      </div>
    `;
  } catch {
    alert("Не удалось загрузить статистику.");
  }
}

async function adminBroadcast() {
  try {
    const broadcasts = await api(`/admin/broadcasts?telegram_id=${encodeURIComponent(user.id)}`);

    app.innerHTML = `
      <div class="screen">
        <div class="header">
          <div class="back" onclick="home()">←</div>
          <h2>Рассылка</h2>
        </div>

        ${adminMainTabs()}

        <div class="details">
          <h3>Новая рассылка</h3>
          <p class="muted">Сообщение уйдёт всем зарегистрированным пользователям через Telegram-бота.</p>
          <textarea id="broadcastText" class="form-textarea" placeholder="Текст сообщения клиентам"></textarea>
          <button class="gold-btn" onclick="sendBroadcast()">Отправить всем</button>
        </div>

        <div class="details">
          <h3>История</h3>
          ${broadcasts.length ? broadcasts.map(b => `
            <div class="review-mini">
              <p>${b.text}</p>
              <small>Отправлено: ${b.sent_count}, ошибок: ${b.failed_count}</small>
            </div>
          `).join("") : `<p class="muted">Рассылок пока нет</p>`}
        </div>

        ${await nav("admin")}
      </div>
    `;
  } catch {
    alert("Не удалось загрузить рассылки.");
  }
}

async function sendBroadcast() {
  const text = document.getElementById("broadcastText")?.value.trim();

  if (!text) {
    alert("Введи текст рассылки.");
    return;
  }

  if (!confirm("Отправить рассылку всем клиентам?")) return;

  try {
    const result = await api(`/admin/broadcast?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "POST",
      body: JSON.stringify({ text })
    });

    if (!result.bot_token_enabled) {
      alert("Рассылка сохранена, но BOT_TOKEN не указан в Render. Сообщения не отправлены.");
    } else {
      alert(`Готово. Отправлено: ${result.sent}, ошибок: ${result.failed}`);
    }

    await adminBroadcast();
  } catch {
    alert("Не удалось отправить рассылку.");
  }
}