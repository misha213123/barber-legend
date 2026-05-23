const API_URL = "https://barber-legend-1.onrender.com";

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const user = tg?.initDataUnsafe?.user || {
  id: "demo_user",
  first_name: "Demo",
  username: "demo_user"
};

let adminMode = "new";
let adminSection = "bookings";

let services = [];
let masters = [];

const fallbackServices = [
  { id: 1, name: "Стрижка", desc: "Классическая мужская стрижка с укладкой", duration: 45, price: 120, icon: "✂️", img: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=600&auto=format&fit=crop", is_active: 1 },
  { id: 2, name: "Стрижка + борода", desc: "Стрижка и оформление бороды", duration: 60, price: 160, icon: "🧔", img: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&auto=format&fit=crop", is_active: 1 },
  { id: 3, name: "Королевское бритьё", desc: "Бритьё опасной бритвой + уход", duration: 40, price: 110, icon: "🪒", img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600&auto=format&fit=crop", is_active: 1 },
  { id: 4, name: "Детская стрижка", desc: "Стрижка для детей до 12 лет", duration: 30, price: 90, icon: "👦", img: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=600&auto=format&fit=crop", is_active: 1 }
];

const fallbackMasters = [
  { id: 1, name: "Алексей", role: "Топ-барбер", rating: "4.9", reviews: 243, img: "https://images.unsplash.com/photo-1618077360395-f3068be8e001?q=80&w=300&auto=format&fit=crop", is_active: 1 },
  { id: 2, name: "Дмитрий", role: "Барбер", rating: "4.8", reviews: 165, img: "https://images.unsplash.com/photo-1622286346003-c2e63b378f17?q=80&w=300&auto=format&fit=crop", is_active: 1 },
  { id: 3, name: "Максим", role: "Барбер", rating: "4.9", reviews: 112, img: "https://images.unsplash.com/photo-1590086783191-a0694c7d1e6e?q=80&w=300&auto=format&fit=crop", is_active: 1 },
  { id: 4, name: "Игорь", role: "Барбер", rating: "4.7", reviews: 98, img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop", is_active: 1 }
];

const times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

let selectedService = null;
let selectedMaster = null;
let selectedDay = { label: "Ср", date: "22 мая, среда" };
let selectedTime = "13:00";
let busyTimes = [];
let adminCache = null;

const app = document.getElementById("app");

function haptic() {
  tg?.HapticFeedback?.impactOccurred("light");
}

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return await res.json();
}

async function loadCatalog(includeInactive = false) {
  try {
    const servicesData = await api(`/services${includeInactive ? "?include_inactive=1" : ""}`);
    const mastersData = await api(`/masters${includeInactive ? "?include_inactive=1" : ""}`);

    services = servicesData.length ? servicesData : fallbackServices;
    masters = mastersData.length ? mastersData : fallbackMasters;
  } catch (e) {
    console.error("Catalog load error:", e);
    services = fallbackServices;
    masters = fallbackMasters;
  }

  if (!selectedService || !services.find(s => s.id === selectedService.id)) {
    selectedService = services.find(s => Number(s.is_active) === 1) || services[0];
  }

  if (!selectedMaster || !masters.find(m => m.id === selectedMaster.id)) {
    selectedMaster = masters.find(m => Number(m.is_active) === 1) || masters[0];
  }
}

async function isAdminUser() {
  if (adminCache !== null) return adminCache;

  try {
    const data = await api(`/me/admin?telegram_id=${encodeURIComponent(user.id)}`);
    adminCache = data.is_admin === true;
    return adminCache;
  } catch (e) {
    console.error("Admin check error:", e);
    adminCache = false;
    return false;
  }
}

async function nav(active = "home") {
  const admin = await isAdminUser();

  return `
    <div class="bottom ${admin ? "admin-nav" : "user-nav"}">
      <div class="nav ${active === "home" ? "active" : ""}" onclick="home()"><b>⌂</b>Главная</div>
      <div class="nav ${active === "booking" ? "active" : ""}" onclick="servicesScreen()"><b>▣</b>Запись</div>
      <div class="nav ${active === "my" ? "active" : ""}" onclick="myBookings()"><b>▤</b>Мои записи</div>
      ${admin ? `<div class="nav ${active === "admin" ? "active" : ""}" onclick="admin()"><b>♙</b>Админ</div>` : ""}
    </div>
  `;
}

async function home() {
  haptic();
  await loadCatalog(false);

  app.innerHTML = `
    <div class="screen">
      <div class="top">
        <div>☰</div>
        <div class="logo">LEGEND<span>BARBERSHOP</span></div>
        <div>♛</div>
      </div>

      <div class="hero-img"></div>

      <div class="hero-title">PREMIUM CUT.<br>REAL EXPERIENCE.</div>
      <p class="muted">Твой стиль. Наше ремесло.</p>

      <button class="gold-btn" onclick="servicesScreen()">▣ Записаться</button>

      <div class="row-title">
        <h2>Наши услуги</h2>
        <span onclick="servicesScreen()">Смотреть все</span>
      </div>

      ${services.filter(s => Number(s.is_active) === 1).map(s => `
        <div class="card" onclick="selectService(${s.id})">
          <div class="icon">${s.icon || "✂️"}</div>
          <div>
            <h3>${s.name}</h3>
            <p>${s.duration} мин · <span class="price">от ${s.price} zł</span></p>
          </div>
        </div>
      `).join("")}

      ${await nav("home")}
    </div>
  `;
}

async function servicesScreen() {
  haptic();
  await loadCatalog(false);

  const activeServices = services.filter(s => Number(s.is_active) === 1);

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="home()">←</div>
        <h2>Выбор услуги</h2>
      </div>

      ${activeServices.map(s => `
        <div class="card ${selectedService?.id === s.id ? "active" : ""}" onclick="selectService(${s.id})">
          <div class="card-img" style="background-image:url('${s.img || s.image || ""}')"></div>
          <div>
            <h3>${s.name}</h3>
            <p>${s.desc || s.description || ""}</p>
            <p>${s.duration} мин · <span class="price">от ${s.price} zł</span></p>
          </div>
          <div class="radio">${selectedService?.id === s.id ? "✓" : ""}</div>
        </div>
      `).join("")}

      <button class="gold-btn" onclick="mastersScreen()">Далее</button>
      ${await nav("booking")}
    </div>
  `;
}

function selectService(id) {
  selectedService = services.find(s => Number(s.id) === Number(id));
  servicesScreen();
}

async function mastersScreen() {
  haptic();
  await loadCatalog(false);

  const activeMasters = masters.filter(m => Number(m.is_active) === 1);

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="servicesScreen()">←</div>
        <h2>Выбор мастера</h2>
      </div>

      ${activeMasters.map(m => `
        <div class="card ${selectedMaster?.id === m.id ? "active" : ""}" onclick="selectMaster(${m.id})">
          <div class="master-avatar" style="background-image:url('${m.img || m.image || ""}')"></div>
          <div>
            <h3>${m.name}</h3>
            <p>${m.role}</p>
            <p><span class="price">★ ${m.rating}</span> (${m.reviews})</p>
          </div>
          <div class="radio">${selectedMaster?.id === m.id ? "✓" : ""}</div>
        </div>
      `).join("")}

      <button class="gold-btn" onclick="timeScreen()">Далее</button>
      ${await nav("booking")}
    </div>
  `;
}

function selectMaster(id) {
  selectedMaster = masters.find(m => Number(m.id) === Number(id));
  mastersScreen();
}

async function loadBusySlots() {
  try {
    const url = `/slots/busy?master=${encodeURIComponent(selectedMaster.name)}&date=${encodeURIComponent(selectedDay.date)}`;
    busyTimes = await api(url);

    if (busyTimes.includes(selectedTime)) {
      selectedTime = times.find(t => !busyTimes.includes(t)) || "";
    }
  } catch {
    busyTimes = [];
  }
}

async function timeScreen() {
  haptic();

  if (!selectedService || !selectedMaster) {
    await loadCatalog(false);
  }

  await loadBusySlots();

  const days = [
    ["Пн", "20", "20 мая, понедельник"],
    ["Вт", "21", "21 мая, вторник"],
    ["Ср", "22", "22 мая, среда"],
    ["Чт", "23", "23 мая, четверг"],
    ["Пт", "24", "24 мая, пятница"],
    ["Сб", "25", "25 мая, суббота"]
  ];

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="mastersScreen()">←</div>
        <h2>Дата и время</h2>
      </div>

      <div class="days">
        ${days.map(d => `
          <div class="day ${selectedDay.date === d[2] ? "active" : ""}" onclick="selectDay('${d[0]}','${d[2]}')">
            <span>${d[0]}</span>${d[1]}
          </div>
        `).join("")}
      </div>

      <div class="time-grid">
        ${times.map(t => {
          const busy = busyTimes.includes(t);
          return `
            <button 
              class="time ${selectedTime === t ? "active" : ""} ${busy ? "busy" : ""}" 
              onclick="${busy ? "" : `selectTime('${t}')`}"
            >
              ${busy ? "Занято" : t}
            </button>
          `;
        }).join("")}
      </div>

      <div class="details">
        <h3>Детали записи</h3>
        <div class="details-row"><span class="muted">Услуга</span><span>${selectedService.name}</span></div>
        <div class="details-row"><span class="muted">Мастер</span><span>${selectedMaster.name}</span></div>
        <div class="details-row"><span class="muted">Дата</span><span>${selectedDay.date}</span></div>
        <div class="details-row"><span class="muted">Время</span><span>${selectedTime || "Нет времени"}</span></div>
        <div class="details-row total"><span>Итого</span><span>${selectedService.price} zł</span></div>
      </div>

      <button class="gold-btn" onclick="confirmBooking()" ${selectedTime ? "" : "disabled"}>Подтвердить запись</button>
      ${await nav("booking")}
    </div>
  `;
}

function selectDay(label, date) {
  selectedDay = { label, date };
  timeScreen();
}

function selectTime(time) {
  selectedTime = time;
  timeScreen();
}

async function confirmBooking() {
  haptic();

  if (!selectedTime) {
    alert("Нет свободного времени.");
    return;
  }

  const payload = {
    telegram_id: String(user.id),
    username: user.username || "",
    first_name: user.first_name || "",
    service: selectedService.name,
    master: selectedMaster.name,
    date: selectedDay.date,
    time: selectedTime,
    price: selectedService.price
  };

  try {
    const res = await fetch(`${API_URL}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.status === 409) {
      alert("Это время уже занято. Выбери другое.");
      timeScreen();
      return;
    }

    if (!res.ok) throw new Error();

    app.innerHTML = `
      <div class="screen success">
        <div class="check">✓</div>
        <h2>Запись создана</h2>
        <p class="muted">${selectedService.name}</p>
        <p>${selectedDay.date} в ${selectedTime}</p>
        <button class="gold-btn" onclick="home()">На главную</button>
        ${await nav("booking")}
      </div>
    `;
  } catch {
    alert("Не удалось создать запись. Проверь backend.");
  }
}

async function myBookings() {
  haptic();

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="home()">←</div>
        <h2>Мои записи</h2>
      </div>
      <p class="muted">Загрузка...</p>
      ${await nav("my")}
    </div>
  `;

  try {
    const bookings = await api(`/bookings/${user.id}`);

    app.innerHTML = `
      <div class="screen">
        <div class="header">
          <div class="back" onclick="home()">←</div>
          <h2>Мои записи</h2>
        </div>

        ${bookings.length ? bookings.map(b => `
          <div class="card">
            <div class="icon">▣</div>
            <div>
              <h3>${b.service}</h3>
              <p>${b.master}</p>
              <p>${b.date} · ${b.time}</p>
              <p class="price">${b.price} zł · ${b.status}</p>
            </div>
          </div>
        `).join("") : `<p class="muted">Записей пока нет</p>`}

        ${await nav("my")}
      </div>
    `;
  } catch {
    alert("Не удалось загрузить мои записи.");
  }
}

async function admin() {
  haptic();

  const adminAccess = await isAdminUser();

  if (!adminAccess) {
    await home();
    return;
  }

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="home()">←</div>
        <h2>Админ-панель</h2>
      </div>
      <p class="muted">Загрузка...</p>
      ${await nav("admin")}
    </div>
  `;

  if (adminSection === "services") {
    await adminServices();
    return;
  }

  if (adminSection === "masters") {
    await adminMasters();
    return;
  }

  await adminBookings();
}

function adminMainTabs() {
  return `
    <div class="admin-tabs three-tabs">
      <button class="${adminSection === "bookings" ? "tab active" : "tab"}" onclick="setAdminSection('bookings')">Записи</button>
      <button class="${adminSection === "services" ? "tab active" : "tab"}" onclick="setAdminSection('services')">Услуги</button>
      <button class="${adminSection === "masters" ? "tab active" : "tab"}" onclick="setAdminSection('masters')">Мастера</button>
    </div>
  `;
}

async function adminBookings() {
  try {
    const allBookings = await api(`/admin/bookings?telegram_id=${encodeURIComponent(user.id)}`);

    const newBookings = allBookings.filter(b => b.status === "Новая");
    const confirmedBookings = allBookings.filter(b => b.status === "Подтверждена");
    const doneBookings = allBookings.filter(b => b.status === "Выполнена");
    const cancelledBookings = allBookings.filter(b => b.status === "Отменена");

    let bookings = newBookings;

    if (adminMode === "confirmed") bookings = confirmedBookings;
    if (adminMode === "done") bookings = doneBookings;
    if (adminMode === "cancelled") bookings = cancelledBookings;

    const revenue = allBookings
      .filter(b => b.status === "Выполнена" || b.status === "Подтверждена")
      .reduce((sum, b) => sum + Number(b.price || 0), 0);

    app.innerHTML = `
      <div class="screen">
        <div class="header">
          <div class="back" onclick="home()">←</div>
          <h2>Админ-панель</h2>
        </div>

        ${adminMainTabs()}

        <div class="admin-grid">
          <div class="stat"><strong>${newBookings.length}</strong><span>Новые</span></div>
          <div class="stat"><strong>${confirmedBookings.length}</strong><span>Подтв.</span></div>
          <div class="stat"><strong>${revenue} zł</strong><span>Сумма</span></div>
        </div>

        <div class="admin-tabs four-tabs">
          <button class="${adminMode === "new" ? "tab active" : "tab"}" onclick="setAdminMode('new')">Новые</button>
          <button class="${adminMode === "confirmed" ? "tab active" : "tab"}" onclick="setAdminMode('confirmed')">Подтв.</button>
          <button class="${adminMode === "done" ? "tab active" : "tab"}" onclick="setAdminMode('done')">Готово</button>
          <button class="${adminMode === "cancelled" ? "tab active" : "tab"}" onclick="setAdminMode('cancelled')">Отмена</button>
        </div>

        ${bookings.length ? bookings.map(b => `
          <div class="card">
            <div class="icon">✂️</div>
            <div>
              <h3>${b.service}</h3>
              <p>Клиент: @${b.username || "без username"}</p>
              <p>Имя: ${b.first_name || "не указано"}</p>
              <p>Мастер: ${b.master}</p>
              <p>${b.date} · ${b.time}</p>
              <p class="price">${b.price} zł · ${b.status}</p>

              ${
                b.status === "Новая"
                  ? `
                    <button class="small-btn" onclick="setStatus(${b.id}, 'Подтверждена')">Подтвердить</button>
                    <button class="small-btn danger" onclick="setStatus(${b.id}, 'Отменена')">Отменить</button>
                  `
                  : ""
              }

              ${
                b.status === "Подтверждена"
                  ? `
                    <button class="small-btn" onclick="setStatus(${b.id}, 'Выполнена')">Выполнена</button>
                    <button class="small-btn danger" onclick="setStatus(${b.id}, 'Отменена')">Отменить</button>
                  `
                  : ""
              }
            </div>
          </div>
        `).join("") : `<p class="muted">Здесь пока пусто</p>`}

        ${await nav("admin")}
      </div>
    `;
  } catch {
    alert("Не удалось загрузить админку.");
  }
}

async function adminServices() {
  await loadCatalog(true);

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="home()">←</div>
        <h2>Услуги</h2>
      </div>

      ${adminMainTabs()}

      <button class="gold-btn" onclick="createService()">+ Добавить услугу</button>

      ${services.map(s => `
        <div class="card admin-edit-card">
          <div class="card-img" style="background-image:url('${s.img || s.image || ""}')"></div>
          <div>
            <h3>${s.name}</h3>
            <p>${s.desc || s.description || ""}</p>
            <p>${s.duration} мин · <span class="price">${s.price} zł</span></p>
            <p>${Number(s.is_active) === 1 ? "🟢 Активна" : "🔴 Скрыта"}</p>

            <button class="small-btn" onclick="editService(${s.id})">Редактировать</button>
            <button class="small-btn" onclick="toggleService(${s.id}, ${Number(s.is_active) === 1 ? 0 : 1})">
              ${Number(s.is_active) === 1 ? "Скрыть" : "Показать"}
            </button>
            <button class="small-btn danger" onclick="deleteService(${s.id})">Удалить</button>
          </div>
        </div>
      `).join("")}

      ${await nav("admin")}
    </div>
  `;
}

async function adminMasters() {
  await loadCatalog(true);

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="home()">←</div>
        <h2>Мастера</h2>
      </div>

      ${adminMainTabs()}

      <button class="gold-btn" onclick="createMaster()">+ Добавить мастера</button>

      ${masters.map(m => `
        <div class="card admin-edit-card">
          <div class="master-avatar" style="background-image:url('${m.img || m.image || ""}')"></div>
          <div>
            <h3>${m.name}</h3>
            <p>${m.role}</p>
            <p><span class="price">★ ${m.rating}</span> (${m.reviews})</p>
            <p>${Number(m.is_active) === 1 ? "🟢 Активен" : "🔴 Скрыт"}</p>

            <button class="small-btn" onclick="editMaster(${m.id})">Редактировать</button>
            <button class="small-btn" onclick="toggleMaster(${m.id}, ${Number(m.is_active) === 1 ? 0 : 1})">
              ${Number(m.is_active) === 1 ? "Скрыть" : "Показать"}
            </button>
            <button class="small-btn danger" onclick="deleteMaster(${m.id})">Удалить</button>
          </div>
        </div>
      `).join("")}

      ${await nav("admin")}
    </div>
  `;
}

function setAdminSection(section) {
  adminSection = section;
  admin();
}

function setAdminMode(mode) {
  adminMode = mode;
  admin();
}

async function setStatus(id, status) {
  haptic();

  try {
    await api(`/admin/bookings/${id}/status?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });

    admin();
  } catch {
    alert("Не удалось изменить статус.");
  }
}

async function createService() {
  const name = prompt("Название услуги:");
  if (!name) return;

  const description = prompt("Описание услуги:", "");
  const duration = Number(prompt("Длительность в минутах:", "45"));
  const price = Number(prompt("Цена в zł:", "120"));
  const icon = prompt("Иконка/эмодзи:", "✂️");
  const image = prompt("Ссылка на фото:", "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=600&auto=format&fit=crop");

  try {
    await api(`/admin/services?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        duration,
        price,
        icon,
        image,
        is_active: 1
      })
    });

    services = [];
    await adminServices();
  } catch {
    alert("Не удалось добавить услугу.");
  }
}

async function editService(id) {
  const s = services.find(item => Number(item.id) === Number(id));
  if (!s) return;

  const name = prompt("Название услуги:", s.name);
  if (!name) return;

  const description = prompt("Описание:", s.desc || s.description || "");
  const duration = Number(prompt("Длительность:", s.duration));
  const price = Number(prompt("Цена:", s.price));
  const icon = prompt("Иконка:", s.icon || "✂️");
  const image = prompt("Ссылка на фото:", s.img || s.image || "");

  try {
    await api(`/admin/services/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        name,
        description,
        duration,
        price,
        icon,
        image
      })
    });

    services = [];
    await adminServices();
  } catch {
    alert("Не удалось изменить услугу.");
  }
}

async function toggleService(id, value) {
  try {
    await api(`/admin/services/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: value })
    });

    services = [];
    await adminServices();
  } catch {
    alert("Не удалось изменить видимость услуги.");
  }
}

async function deleteService(id) {
  if (!confirm("Удалить услугу?")) return;

  try {
    await api(`/admin/services/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "DELETE"
    });

    services = [];
    await adminServices();
  } catch {
    alert("Не удалось удалить услугу.");
  }
}

async function createMaster() {
  const name = prompt("Имя мастера:");
  if (!name) return;

  const role = prompt("Роль/специализация:", "Барбер");
  const rating = prompt("Рейтинг:", "5.0");
  const reviews = Number(prompt("Количество отзывов:", "0"));
  const image = prompt("Ссылка на фото:", "https://images.unsplash.com/photo-1618077360395-f3068be8e001?q=80&w=300&auto=format&fit=crop");

  try {
    await api(`/admin/masters?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "POST",
      body: JSON.stringify({
        name,
        role,
        rating,
        reviews,
        image,
        is_active: 1
      })
    });

    masters = [];
    await adminMasters();
  } catch {
    alert("Не удалось добавить мастера.");
  }
}

async function editMaster(id) {
  const m = masters.find(item => Number(item.id) === Number(id));
  if (!m) return;

  const name = prompt("Имя мастера:", m.name);
  if (!name) return;

  const role = prompt("Роль/специализация:", m.role || "");
  const rating = prompt("Рейтинг:", m.rating || "5.0");
  const reviews = Number(prompt("Количество отзывов:", m.reviews || 0));
  const image = prompt("Ссылка на фото:", m.img || m.image || "");

  try {
    await api(`/admin/masters/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        name,
        role,
        rating,
        reviews,
        image
      })
    });

    masters = [];
    await adminMasters();
  } catch {
    alert("Не удалось изменить мастера.");
  }
}

async function toggleMaster(id, value) {
  try {
    await api(`/admin/masters/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: value })
    });

    masters = [];
    await adminMasters();
  } catch {
    alert("Не удалось изменить видимость мастера.");
  }
}

async function deleteMaster(id) {
  if (!confirm("Удалить мастера?")) return;

  try {
    await api(`/admin/masters/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "DELETE"
    });

    masters = [];
    await adminMasters();
  } catch {
    alert("Не удалось удалить мастера.");
  }
}

home();