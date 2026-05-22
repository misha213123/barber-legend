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

const ADMIN_IDS = ["6863310038"]; // сюда поставь свой Telegram ID
let adminMode = "active";

const services = [
  { id: 1, name: "Стрижка", desc: "Классическая мужская стрижка с укладкой", duration: 45, price: 120, icon: "✂️", img: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=600&auto=format&fit=crop" },
  { id: 2, name: "Стрижка + борода", desc: "Стрижка и оформление бороды", duration: 60, price: 160, icon: "🧔", img: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&auto=format&fit=crop" },
  { id: 3, name: "Королевское бритьё", desc: "Бритьё опасной бритвой + уход", duration: 40, price: 110, icon: "🪒", img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600&auto=format&fit=crop" },
  { id: 4, name: "Детская стрижка", desc: "Стрижка для детей до 12 лет", duration: 30, price: 90, icon: "👦", img: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=600&auto=format&fit=crop" }
];

const masters = [
  { id: 1, name: "Алексей", role: "Топ-барбер", rating: "4.9", reviews: 243, img: "https://images.unsplash.com/photo-1618077360395-f3068be8e001?q=80&w=300&auto=format&fit=crop" },
  { id: 2, name: "Дмитрий", role: "Барбер", rating: "4.8", reviews: 165, img: "https://images.unsplash.com/photo-1622286346003-c2e63b378f17?q=80&w=300&auto=format&fit=crop" },
  { id: 3, name: "Максим", role: "Барбер", rating: "4.9", reviews: 112, img: "https://images.unsplash.com/photo-1590086783191-a0694c7d1e6e?q=80&w=300&auto=format&fit=crop" },
  { id: 4, name: "Игорь", role: "Барбер", rating: "4.7", reviews: 98, img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop" }
];

const times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

let selectedService = services[0];
let selectedMaster = masters[0];
let selectedDay = { label: "Ср", date: "22 мая, среда" };
let selectedTime = "13:00";
let busyTimes = [];

const app = document.getElementById("app");

function haptic() {
  tg?.HapticFeedback?.impactOccurred("light");
}

function isAdminUser() {
  return ADMIN_IDS.map(String).includes(String(user.id));
}

function nav(active = "home") {
  const admin = isAdminUser();

  return `
    <div class="bottom ${admin ? "admin-nav" : "user-nav"}">
      <div class="nav ${active === "home" ? "active" : ""}" onclick="home()"><b>⌂</b>Главная</div>
      <div class="nav ${active === "booking" ? "active" : ""}" onclick="servicesScreen()"><b>▣</b>Запись</div>
      <div class="nav ${active === "my" ? "active" : ""}" onclick="myBookings()"><b>▤</b>Мои записи</div>
      ${admin ? `<div class="nav ${active === "admin" ? "active" : ""}" onclick="admin()"><b>♙</b>Админ</div>` : ""}
    </div>
  `;
}

function home() {
  haptic();

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
      <p class="muted">Твой ID: ${user.id}</p>
      <button class="gold-btn" onclick="servicesScreen()">▣ Записаться</button>

      <div class="row-title">
        <h2>Наши услуги</h2>
        <span onclick="servicesScreen()">Смотреть все</span>
      </div>

      ${services.map(s => `
        <div class="card" onclick="selectService(${s.id})">
          <div class="icon">${s.icon}</div>
          <div>
            <h3>${s.name}</h3>
            <p>${s.duration} мин · <span class="price">от ${s.price} zł</span></p>
          </div>
        </div>
      `).join("")}

      ${nav("home")}
    </div>
  `;
}

function servicesScreen() {
  haptic();

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="home()">←</div>
        <h2>Выбор услуги</h2>
      </div>

      ${services.map(s => `
        <div class="card ${selectedService.id === s.id ? "active" : ""}" onclick="selectService(${s.id})">
          <div class="card-img" style="background-image:url('${s.img}')"></div>
          <div>
            <h3>${s.name}</h3>
            <p>${s.desc}</p>
            <p>${s.duration} мин · <span class="price">от ${s.price} zł</span></p>
          </div>
          <div class="radio">${selectedService.id === s.id ? "✓" : ""}</div>
        </div>
      `).join("")}

      <button class="gold-btn" onclick="mastersScreen()">Далее</button>
      ${nav("booking")}
    </div>
  `;
}

function selectService(id) {
  selectedService = services.find(s => s.id === id);
  servicesScreen();
}

function mastersScreen() {
  haptic();

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="servicesScreen()">←</div>
        <h2>Выбор мастера</h2>
      </div>

      ${masters.map(m => `
        <div class="card ${selectedMaster.id === m.id ? "active" : ""}" onclick="selectMaster(${m.id})">
          <div class="master-avatar" style="background-image:url('${m.img}')"></div>
          <div>
            <h3>${m.name}</h3>
            <p>${m.role}</p>
            <p><span class="price">★ ${m.rating}</span> (${m.reviews})</p>
          </div>
          <div class="radio">${selectedMaster.id === m.id ? "✓" : ""}</div>
        </div>
      `).join("")}

      <button class="gold-btn" onclick="timeScreen()">Далее</button>
      ${nav("booking")}
    </div>
  `;
}

function selectMaster(id) {
  selectedMaster = masters.find(m => m.id === id);
  mastersScreen();
}

async function loadBusySlots() {
  try {
    const url = `${API_URL}/slots/busy?master=${encodeURIComponent(selectedMaster.name)}&date=${encodeURIComponent(selectedDay.date)}`;
    const res = await fetch(url);
    busyTimes = await res.json();

    if (busyTimes.includes(selectedTime)) {
      selectedTime = times.find(t => !busyTimes.includes(t)) || "";
    }
  } catch {
    busyTimes = [];
  }
}

async function timeScreen() {
  haptic();
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
      ${nav("booking")}
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
        ${nav("booking")}
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
      ${nav("my")}
    </div>
  `;

  try {
    const res = await fetch(`${API_URL}/bookings/${user.id}`);
    const bookings = await res.json();

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

        ${nav("my")}
      </div>
    `;
  } catch {
    alert("Не удалось загрузить мои записи.");
  }
}

async function admin() {
  haptic();

  if (!isAdminUser()) {
    home();
    return;
  }

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="home()">←</div>
        <h2>Админ-панель</h2>
      </div>
      <p class="muted">Загрузка...</p>
      ${nav("admin")}
    </div>
  `;

  try {
    const res = await fetch(`${API_URL}/admin/bookings?telegram_id=${encodeURIComponent(user.id)}`);

    if (res.status === 403) {
      alert("Нет доступа к админке.");
      home();
      return;
    }

    const allBookings = await res.json();

    const activeBookings = allBookings.filter(
      b => b.status === "Новая" || b.status === "Подтверждена"
    );

    const historyBookings = allBookings.filter(
      b => b.status === "Выполнена" || b.status === "Отменена"
    );

    const bookings = adminMode === "active" ? activeBookings : historyBookings;

    const revenue = allBookings
      .filter(b => b.status !== "Отменена")
      .reduce((sum, b) => sum + Number(b.price || 0), 0);

    app.innerHTML = `
      <div class="screen">
        <div class="header">
          <div class="back" onclick="home()">←</div>
          <h2>Админ-панель</h2>
        </div>

        <div class="admin-grid">
          <div class="stat"><strong>${activeBookings.length}</strong><span>Активных</span></div>
          <div class="stat"><strong>${historyBookings.length}</strong><span>История</span></div>
          <div class="stat"><strong>${revenue} zł</strong><span>Сумма</span></div>
        </div>

        <div class="admin-tabs">
          <button class="${adminMode === "active" ? "tab active" : "tab"}" onclick="setAdminMode('active')">Активные</button>
          <button class="${adminMode === "history" ? "tab active" : "tab"}" onclick="setAdminMode('history')">История</button>
        </div>

        ${bookings.length ? bookings.map(b => `
          <div class="card">
            <div class="icon">✂️</div>
            <div>
              <h3>${b.service}</h3>
              <p>Клиент: @${b.username || "без username"}</p>
              <p>Мастер: ${b.master}</p>
              <p>${b.date} · ${b.time}</p>
              <p class="price">${b.price} zł · ${b.status}</p>

              ${adminMode === "active" ? `
                <button class="small-btn" onclick="setStatus(${b.id}, 'Подтверждена')">Подтвердить</button>
                <button class="small-btn" onclick="setStatus(${b.id}, 'Выполнена')">Выполнена</button>
                <button class="small-btn" onclick="setStatus(${b.id}, 'Отменена')">Отменить</button>
              ` : ""}
            </div>
          </div>
        `).join("") : `<p class="muted">Здесь пока пусто</p>`}

        ${nav("admin")}
      </div>
    `;
  } catch {
    alert("Не удалось загрузить админку.");
  }
}

function setAdminMode(mode) {
  adminMode = mode;
  admin();
}

async function setStatus(id, status) {
  haptic();

  try {
    const res = await fetch(`${API_URL}/admin/bookings/${id}/status?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    if (!res.ok) throw new Error();

    admin();
  } catch {
    alert("Не удалось изменить статус.");
  }
}

home();