async function historyProScreen() {
  haptic();

  let data = { bookings: [], reviews: [] };

  try {
    data = await api(`/client/history?telegram_id=${encodeURIComponent(user.id)}`);
  } catch {
    data = { bookings: [], reviews: [] };
  }

  const done = data.bookings.filter(b => b.status === "Выполнена");
  const active = data.bookings.filter(b => b.status !== "Выполнена" && b.status !== "Отменена");

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="openClientMenu()">←</div>
        <h2>История</h2>
      </div>

      <div class="admin-grid">
        <div class="stat"><strong>${data.bookings.length}</strong><span>Всего</span></div>
        <div class="stat"><strong>${done.length}</strong><span>Визитов</span></div>
        <div class="stat"><strong>${data.reviews.length}</strong><span>Отзывов</span></div>
      </div>

      <div class="details">
        <h3>Активные записи</h3>
        ${active.length ? active.map(b => `
          <div class="history-item">
            <b>${b.service}</b>
            <p>${b.master} · ${formatDisplayDate(b.date)} · ${b.time}</p>
            <span>${b.status}</span>
          </div>
        `).join("") : `<p class="muted">Активных записей нет</p>`}
      </div>

      <div class="details">
        <h3>Прошлые визиты</h3>
        ${done.length ? done.map(b => `
          <div class="history-item">
            <b>${b.service}</b>
            <p>${b.master} · ${formatDisplayDate(b.date)} · ${b.time}</p>
            <span>${b.price} zł</span>
          </div>
        `).join("") : `<p class="muted">Истории пока нет</p>`}
      </div>

      ${await nav("home")}
    </div>
  `;
}

async function myReviewsScreen() {
  haptic();

  await loadMyReviews();

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="openClientMenu()">←</div>
        <h2>Мои отзывы</h2>
      </div>

      ${myReviews.length ? myReviews.map(r => `
        <div class="card lift-card">
          <div class="icon">⭐</div>
          <div>
            <h3>${r.service}</h3>
            <p>${r.master}</p>
            <p>${starsHtml(r.rating)}</p>
            <p>${r.comment || "Без комментария"}</p>
          </div>
        </div>
      `).join("") : `<p class="muted">Ты ещё не оставлял отзывы</p>`}

      ${await nav("home")}
    </div>
  `;
}