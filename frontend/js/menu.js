async function loadClientSummary() {
  try {
    clientSummary = await api(`/client/summary?telegram_id=${encodeURIComponent(user.id)}`);
    favoriteMaster = clientSummary.favorite_master || null;
  } catch {
    clientSummary = null;
    favoriteMaster = null;
  }

  return clientSummary;
}

async function openClientMenu() {
  haptic();
  await loadClientSummary();

  const name = clientSummary?.profile?.full_name || user.first_name || "Клиент";
  const level = clientSummary?.level || "Bronze";
  const visits = clientSummary?.total_visits || 0;
  const discount = clientSummary?.discount || 0;

  app.innerHTML = `
    <div class="screen menu-screen">
      <div class="menu-top">
        <button class="menu-close" onclick="home()">×</button>
        <div class="menu-logo">LEGEND<span>BARBERSHOP</span></div>
      </div>

      <div class="client-mini-card">
        <div class="client-avatar">${String(name).charAt(0).toUpperCase()}</div>
        <div>
          <h2>${name}</h2>
          <p>${level} · ${visits} визитов · скидка ${discount}%</p>
        </div>
      </div>

      <div class="menu-list">
        <button onclick="clientProfileScreen()">👤 <span>Профиль</span></button>
        <button onclick="quickBookingScreen()">⚡ <span>Быстрая запись</span></button>
        <button onclick="favoriteMasterScreen()">❤️ <span>Любимый мастер</span></button>
        <button onclick="loyaltyScreen()">🎁 <span>Бонусы</span></button>
        <button onclick="historyProScreen()">🕘 <span>История посещений</span></button>
        <button onclick="myReviewsScreen()">⭐ <span>Мои отзывы</span></button>
        <button onclick="contactsScreen()">📞 <span>Контакты</span></button>
        <button onclick="locationScreen()">📍 <span>Как добраться</span></button>
      </div>

      ${await nav("home")}
    </div>
  `;
}

async function contactsScreen() {
  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="openClientMenu()">←</div>
        <h2>Контакты</h2>
      </div>

      <div class="details">
        <h3>Legend Barbershop</h3>
        <p>Телефон: <a class="tg-link" href="tel:+48000000000">+48 000 000 000</a></p>
        <p>Telegram: <a class="tg-link" href="https://t.me/" target="_blank">написать в Telegram</a></p>
        <p>Instagram: <a class="tg-link" href="https://instagram.com/" target="_blank">открыть Instagram</a></p>
      </div>

      ${await nav("home")}
    </div>
  `;
}

async function locationScreen() {
  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="openClientMenu()">←</div>
        <h2>Как добраться</h2>
      </div>

      <div class="details">
        <h3>Адрес</h3>
        <p class="muted">Укажи тут реальный адрес барбершопа.</p>
        <p>Warszawa, Poland</p>
        <button class="gold-btn" onclick="window.open('https://maps.google.com', '_blank')">Открыть карту</button>
      </div>

      ${await nav("home")}
    </div>
  `;
}

async function quickBookingScreen() {
  haptic();
  await loadClientSummary();
  await loadCatalog(false);

  const last = clientSummary?.last_booking;

  if (!last) {
    alert("У тебя ещё нет прошлых записей. Сначала сделай обычную запись.");
    await servicesScreen();
    return;
  }

  selectedService = services.find(s => s.name === last.service) || selectedService;
  selectedMaster = masters.find(m => m.name === last.master) || selectedMaster;
  selectedTime = "";
  masterHours = null;

  await timeScreen();
}