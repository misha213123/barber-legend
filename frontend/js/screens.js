function pad2(value) {
  return String(value).padStart(2, "0");
}

function toISODate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatDisplayDate(iso) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });
}

function getDayLabelFromDate(date) {
  return ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][date.getDay()];
}

function getBookingDays(count = 30) {
  const result = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = toISODate(d);

    result.push({
      label: getDayLabelFromDate(d),
      day: String(d.getDate()),
      month: d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", ""),
      date: iso,
      display: formatDisplayDate(iso)
    });
  }

  return result;
}

function ensureSelectedDay() {
  const days = getBookingDays();
  if (!selectedDay || !days.find(d => d.date === selectedDay.date)) {
    selectedDay = days[0];
  }
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function isTimeInsideWorkingHours(time) {
  if (!masterHours || Number(masterHours.is_working) !== 1) return false;
  const current = timeToMinutes(time);
  const start = timeToMinutes(masterHours.start_time || "09:00");
  const end = timeToMinutes(masterHours.end_time || "20:00");
  return current >= start && current <= end;
}

function isSelectedShopClosed() {
  return shopClosedDays.some(item => item.date === selectedDay?.date);
}

function isSelectedMasterDayOff() {
  return masterDayOffs.some(item => item.date === selectedDay?.date);
}

async function home() {
  haptic();
  await loadCatalog(false);
  await loadWorkPhotos(false);

  const visiblePhotos = workPhotos.filter(p => Number(p.is_active) === 1).slice(0, 6);
  const activeServices = services.filter(s => Number(s.is_active) === 1);

  app.innerHTML = `
    <div class="screen">
      <div class="top">
        <div>☰</div>
        <div class="logo">LEGEND<span>BARBERSHOP</span></div>
        <div>♛</div>
      </div>

      <div class="hero-img"></div>

      <div class="hero-title">REAL EXPERIENCE.</div>
      <p class="muted hero-subtitle">Твой стиль. Наше ремесло.</p>

      <button class="gold-btn pulse" onclick="servicesScreen()">▣ Записаться</button>

      <div class="row-title">
        <h2>Наши услуги</h2>
        <span onclick="servicesScreen()">Смотреть все</span>
      </div>

      ${activeServices.slice(0, 4).map(s => `
        <div class="card lift-card" onclick="selectService(${s.id})">
          <div class="card-img" style="background-image:url('${s.img || s.image || ""}')"></div>
          <div>
            <h3>${s.name}</h3>
            <p>${s.desc || s.description || ""}</p>
            <p>${s.duration} мин · <span class="price">от ${s.price} zł</span></p>
          </div>
        </div>
      `).join("")}

      <div class="row-title">
        <h2>Работы мастеров</h2>
        <span>Портфолио</span>
      </div>

      <div class="gallery-grid">
        ${visiblePhotos.map(p => `
          <div class="work-photo" style="background-image:url('${p.img || p.image || ""}')">
            <div>${p.title || "Работа"}</div>
          </div>
        `).join("")}
      </div>

      ${await nav("home")}
    </div>
  `;
}

async function servicesScreen() {
  haptic();
  ensureSelectedDay();
  await loadCatalog(false);

  const activeServices = services.filter(s => Number(s.is_active) === 1);

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="home()">←</div>
        <h2>Выбор услуги</h2>
      </div>

      ${activeServices.map(s => `
        <div class="card lift-card ${selectedService?.id === s.id ? "active" : ""}" onclick="selectService(${s.id})">
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
        <div class="card lift-card ${selectedMaster?.id === m.id ? "active" : ""}" onclick="selectMaster(${m.id})">
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
  masterHours = null;
  mastersScreen();
}

async function loadBusySlots() {
  try {
    busyTimes = await api(`/slots/busy?master=${encodeURIComponent(selectedMaster.name)}&date=${encodeURIComponent(selectedDay.date)}`);
  } catch {
    busyTimes = [];
  }
}

async function loadMasterHours() {
  try {
    masterHours = await api(`/master-hours?master=${encodeURIComponent(selectedMaster.name)}&day_label=${encodeURIComponent(selectedDay.label)}`);
  } catch {
    masterHours = { day_label: selectedDay.label, start_time: "09:00", end_time: "20:00", is_working: 1 };
  }
}

async function loadClosedDaysForCalendar() {
  const days = getBookingDays(30);
  const start = days[0].date;
  const end = days[days.length - 1].date;

  try {
    shopClosedDays = await api(`/shop-closed-days?start_date=${start}&end_date=${end}`);
  } catch {
    shopClosedDays = [];
  }

  try {
    masterDayOffs = await api(`/master-day-offs?master=${encodeURIComponent(selectedMaster.name)}&start_date=${start}&end_date=${end}`);
  } catch {
    masterDayOffs = [];
  }
}

function normalizeSelectedTime() {
  if (isSelectedShopClosed() || isSelectedMasterDayOff()) {
    selectedTime = "";
    return;
  }

  if (!selectedTime || busyTimes.includes(selectedTime) || !isTimeInsideWorkingHours(selectedTime)) {
    selectedTime = times.find(t => !busyTimes.includes(t) && isTimeInsideWorkingHours(t)) || "";
  }
}

async function timeScreen() {
  haptic();
  ensureSelectedDay();

  if (!selectedService || !selectedMaster) {
    await loadCatalog(false);
  }

  await loadClosedDaysForCalendar();
  await loadBusySlots();
  await loadMasterHours();
  normalizeSelectedTime();

  const days = getBookingDays(30);
  const isReschedule = Boolean(rescheduleBookingId);
  const closed = isSelectedShopClosed();
  const masterOff = isSelectedMasterDayOff();

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="${isReschedule ? "myBookings()" : "mastersScreen()"}">←</div>
        <h2>${isReschedule ? "Перенос записи" : "Дата и время"}</h2>
      </div>

      ${isReschedule ? `<p class="muted">Выбери новое время для записи: ${rescheduleBooking.service}</p>` : ""}

      <div class="calendar-panel">
  <button class="calendar-arrow" onclick="prevCalendarPage()" ${calendarOffset === 0 ? "disabled" : ""}>←</button>

  <div class="days">
    ${generateBookingDays().map(d => `
      <div class="day ${selectedDay.date === d.full ? "active" : ""} ${d.isPast ? "disabled" : ""}"
        onclick="${d.isPast ? "" : `selectDay('${d.label}', '${d.full}', '${d.raw}')`}">
        <span>${d.label}</span>
        ${d.number}
        <small>${d.month}</small>
      </div>
    `).join("")}
  </div>

  <button class="calendar-arrow" onclick="nextCalendarPage()">→</button>
</div>

      <div class="work-hours-note">
        ${closed ? "Заведение закрыто в этот день" : masterOff ? "У мастера выходной в этот день" : Number(masterHours?.is_working) === 1 ? `Рабочее время мастера: ${masterHours.start_time}–${masterHours.end_time}` : "В этот день мастер не работает"}
      </div>

      <div class="time-grid">
        ${times.map(t => {
          const busy = busyTimes.includes(t);
          const outside = !isTimeInsideWorkingHours(t);
          const disabled = busy || outside || closed || masterOff;
          return `
            <button class="time ${selectedTime === t ? "active" : ""} ${disabled ? "busy" : ""}" onclick="${disabled ? "" : `selectTime('${t}')`}">
              ${busy ? "Занято" : outside || closed || masterOff ? "—" : t}
            </button>
          `;
        }).join("")}
      </div>

      <div class="details">
        <h3>Детали записи</h3>
        <div class="details-row"><span class="muted">Услуга</span><span>${selectedService.name}</span></div>
        <div class="details-row"><span class="muted">Мастер</span><span>${selectedMaster.name}</span></div>
        <div class="details-row"><span class="muted">Дата</span><span>${formatDisplayDate(selectedDay.date)}</span></div>
        <div class="details-row"><span class="muted">Время</span><span>${selectedTime || "Нет времени"}</span></div>
        <div class="details-row total"><span>Итого</span><span>${selectedService.price} zł</span></div>
      </div>

      <button class="gold-btn" onclick="${isReschedule ? "confirmReschedule()" : "confirmBooking()"}" ${selectedTime ? "" : "disabled"}>
        ${isReschedule ? "Сохранить новое время" : "Подтвердить запись"}
      </button>
      ${await nav("booking")}
    </div>
  `;
}

function selectDay(label, date, raw = "") {
  if (raw && isPastDate(raw)) {
    alert("Нельзя записаться на прошедшую дату.");
    return;
  }

  selectedDay = { label, date, raw };
  masterHours = null;
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
    price: Number(selectedService.price || 0)
  };

  try {
    const res = await fetch(`${API_URL}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.status === 409 || res.status === 400) {
      const data = await res.json().catch(() => ({}));
      alert(data.detail || "Это время недоступно. Выбери другое.");
      timeScreen();
      return;
    }

    if (!res.ok) throw new Error();

    app.innerHTML = `
      <div class="screen success">
        <div class="check">✓</div>
        <h2>Запись создана</h2>
        <p class="muted">${selectedService.name}</p>
        <p>${formatDisplayDate(selectedDay.date)} в ${selectedTime}</p>
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
  rescheduleBookingId = null;
  rescheduleBooking = null;

  app.innerHTML = `
    <div class="screen">
      <div class="header"><div class="back" onclick="home()">←</div><h2>Мои записи</h2></div>
      <p class="muted">Загрузка...</p>
      ${await nav("my")}
    </div>
  `;

  try {
    const bookings = await api(`/bookings/${user.id}`);

    app.innerHTML = `
      <div class="screen">
        <div class="header"><div class="back" onclick="home()">←</div><h2>Мои записи</h2></div>

        ${bookings.length ? bookings.map(b => {
          const canChange = b.status !== "Выполнена" && b.status !== "Отменена";
          const dateText = /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? formatDisplayDate(b.date) : b.date;
          return `
            <div class="card lift-card">
              <div class="icon">▣</div>
              <div>
                <h3>${b.service}</h3>
                <p>${b.master}</p>
                <p>${dateText} · ${b.time}</p>
                <p class="price">${b.price} zł · ${b.status}</p>
                ${canChange ? `
                  <button class="small-btn" onclick="startReschedule(${b.id})">Перезаписаться</button>
                  <button class="small-btn danger" onclick="cancelBooking(${b.id})">Отменить запись</button>
                ` : ""}
              </div>
            </div>
          `;
        }).join("") : `<p class="muted">Записей пока нет</p>`}

        ${await nav("my")}
      </div>
    `;
  } catch {
    alert("Не удалось загрузить мои записи.");
  }
}

async function cancelBooking(id) {
  haptic();
  if (!confirm("Отменить эту запись?")) return;

  try {
    await api(`/bookings/${id}/cancel?telegram_id=${encodeURIComponent(user.id)}`, { method: "PATCH" });
    await myBookings();
  } catch {
    alert("Не удалось отменить запись.");
  }
}

async function startReschedule(id) {
  haptic();

  try {
    const bookings = await api(`/bookings/${user.id}`);
    const booking = bookings.find(item => Number(item.id) === Number(id));
    if (!booking) return;

    await loadCatalog(false);

    selectedService = services.find(s => s.name === booking.service) || { id: 0, name: booking.service, price: booking.price, duration: 30, is_active: 1 };
    selectedMaster = masters.find(m => m.name === booking.master) || { id: 0, name: booking.master, role: "Мастер", rating: "5.0", reviews: 0, is_active: 1 };

    const days = getBookingDays();
    const foundDay = days.find(d => d.date === booking.date);
    selectedDay = foundDay || days[0];
    selectedTime = booking.time;
    rescheduleBookingId = id;
    rescheduleBooking = booking;
    masterHours = null;

    await timeScreen();
  } catch {
    alert("Не удалось открыть перенос записи.");
  }
}

async function confirmReschedule() {
  haptic();

  if (!rescheduleBookingId || !selectedTime) return;

  try {
    await api(`/bookings/${rescheduleBookingId}/reschedule?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ date: selectedDay.date, time: selectedTime })
    });

    rescheduleBookingId = null;
    rescheduleBooking = null;

    app.innerHTML = `
      <div class="screen success">
        <div class="check">✓</div>
        <h2>Запись перенесена</h2>
        <p>${formatDisplayDate(selectedDay.date)} в ${selectedTime}</p>
        <button class="gold-btn" onclick="myBookings()">Мои записи</button>
        ${await nav("my")}
      </div>
    `;
  } catch {
    alert("Не удалось перенести запись. Возможно, время недоступно.");
  }
}
