async function clientProfileScreen() {
  haptic();
  await loadClientSummary();

  const profile = clientSummary?.profile || {};
  const name = profile.full_name || user.first_name || "Клиент";

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="openClientMenu()">←</div>
        <h2>Профиль</h2>
      </div>

      <div class="client-profile-card">
        <div class="client-avatar big">${String(name).charAt(0).toUpperCase()}</div>
        <h2>${name}</h2>
        <p class="muted">${user.username ? "@" + user.username : "username не указан"}</p>
      </div>

      <div class="details">
        <h3>Контакты</h3>
        <div class="details-row"><span class="muted">Телефон</span><span>${profile.phone || "не указан"}</span></div>
        <div class="details-row"><span class="muted">Email</span><span>${profile.email || "не указан"}</span></div>
        <div class="details-row"><span class="muted">Telegram ID</span><span>${user.id}</span></div>
      </div>

      <div class="details">
        <h3>Активность</h3>
        <div class="details-row"><span class="muted">Визитов</span><span>${clientSummary?.total_visits || 0}</span></div>
        <div class="details-row"><span class="muted">Потрачено</span><span>${clientSummary?.total_spent || 0} zł</span></div>
        <div class="details-row"><span class="muted">Отзывов</span><span>${clientSummary?.reviews_count || 0}</span></div>
      </div>

      <button class="gold-btn" onclick="editClientProfileScreen()">Изменить данные</button>

      ${await nav("home")}
    </div>
  `;
}

async function editClientProfileScreen() {
  await loadMyProfile();
  registrationScreen(currentProfile);
}