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
    busyTimes = await api(`/slots/busy?master=${encodeURIComponent(selectedMaster.name)}&date=${encodeURIComponent(selectedDay.date)}`);
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
            <button class="time ${selectedTime === t ? "active" : ""} ${busy ? "busy" : ""}" onclick="${busy ? "" : `selectTime('${t}')`}">
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