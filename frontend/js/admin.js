async function admin() {
  haptic();

  const adminAccess = await isAdminUser();

  if (adminSection === "admins") {
    await adminAppAdmins();
    return;
  }

  if (adminSection === "users") {
    await adminUsers();
    return;
  }


  if (!adminAccess) {
    await home();
    return;
  }

  if (adminSection === "services") {
    await adminServices();
    return;
  }

  if (adminSection === "masters") {
    await adminMasters();
    return;
  }

  if (adminSection === "works") {
    await adminWorks();
    return;
  }

  if (adminSection === "schedule") {
    await adminSchedule();
    return;
  }

  await adminBookings();
}

function adminMainTabs() {
  return `
    <div class="admin-tabs six-tabs">
      <button class="${adminSection === "bookings" ? "tab active" : "tab"}" onclick="setAdminSection('bookings')">Записи</button>
      <button class="${adminSection === "services" ? "tab active" : "tab"}" onclick="setAdminSection('services')">Услуги</button>
      <button class="${adminSection === "masters" ? "tab active" : "tab"}" onclick="setAdminSection('masters')">Мастера</button>
      <button class="${adminSection === "works" ? "tab active" : "tab"}" onclick="setAdminSection('works')">Работы</button>
      <button class="${adminSection === "schedule" ? "tab active" : "tab"}" onclick="setAdminSection('schedule')">График</button>
      <button class="${adminSection === "admins" ? "tab active" : "tab"}" onclick="setAdminSection('admins')">Админы</button>
      <button class="${adminSection === "users" ? "tab active" : "tab"}" onclick="setAdminSection('users')">Клиенты</button>
    </div>
  `;
}

function setAdminSection(section) {
  adminSection = section;
  editingMasterHoursId = null;
  editingMasterHoursName = "";
  masterHoursDraft = [];
  admin();
}

function setAdminMode(mode) {
  adminMode = mode;
  admin();
}

function fileToCompressedDataUrl(file, maxSize = 1100, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }

        if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function chooseImageFromDevice() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";

    input.onchange = async () => {
      const file = input.files && input.files[0];

      if (!file) {
        resolve("");
        return;
      }

      try {
        const dataUrl = await fileToCompressedDataUrl(file);
        resolve(dataUrl);
      } catch {
        alert("Не удалось обработать фото.");
        resolve("");
      } finally {
        input.remove();
      }
    };

    document.body.appendChild(input);
    input.click();
  });
}

function parseMoney(value, fallback = 0) {
  const cleaned = String(value ?? "").replace(",", ".").replace(/[^0-9.]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? Math.round(number) : Number(fallback || 0);
}

function getAdminCalendarDays(count = 30) {
  return getBookingDays(count);
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
        <div class="header"><div class="back" onclick="home()">←</div><h2>Админ-панель</h2></div>

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

        ${bookings.length ? bookings.map(b => {
          const dateText = /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? formatDisplayDate(b.date) : b.date;
          return `
            <div class="card lift-card">
              <div class="icon">✂️</div>
              <div>
                <h3>${b.service}</h3>
                <p>Клиент: @${b.username || "без username"}</p>
                <p>Имя: ${b.first_name || "не указано"}</p>
                <p>Мастер: ${b.master}</p>
                <p>${dateText} · ${b.time}</p>
                <p class="price">${b.price} zł · ${b.status}</p>
                ${b.status === "Новая" ? `
                  <button class="small-btn" onclick="setStatus(${b.id}, 'Подтверждена')">Подтвердить</button>
                  <button class="small-btn danger" onclick="setStatus(${b.id}, 'Отменена')">Отменить</button>
                ` : ""}
                ${b.status === "Подтверждена" ? `
                  <button class="small-btn" onclick="setStatus(${b.id}, 'Выполнена')">Выполнена</button>
                  <button class="small-btn danger" onclick="setStatus(${b.id}, 'Отменена')">Отменить</button>
                ` : ""}
              </div>
            </div>
          `;
        }).join("") : `<p class="muted">Здесь пока пусто</p>`}

        ${await nav("admin")}
      </div>
    `;
  } catch {
    alert("Не удалось загрузить админку.");
  }
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

async function adminServices() {
  await loadCatalog(true);

  app.innerHTML = `
    <div class="screen">
      <div class="header"><div class="back" onclick="home()">←</div><h2>Услуги</h2></div>
      ${adminMainTabs()}
      <button class="gold-btn" onclick="createService()">+ Добавить услугу</button>

      ${services.map(s => `
        <div class="card admin-edit-card lift-card">
          <div class="card-img" style="background-image:url('${s.img || s.image || ""}')"></div>
          <div>
            <h3>${s.name}</h3>
            <p>${s.desc || s.description || ""}</p>
            <p>${s.duration} мин · <span class="price">${s.price} zł</span></p>
            <p>${Number(s.is_active) === 1 ? "🟢 Активна" : "🔴 Скрыта"}</p>
            <button class="small-btn" onclick="editService(${s.id})">Редактировать</button>
            <button class="small-btn" onclick="changeServicePhoto(${s.id})">Заменить фото</button>
            <button class="small-btn" onclick="toggleService(${s.id}, ${Number(s.is_active) === 1 ? 0 : 1})">${Number(s.is_active) === 1 ? "Скрыть" : "Показать"}</button>
            <button class="small-btn danger" onclick="deleteService(${s.id})">Удалить</button>
          </div>
        </div>
      `).join("")}

      ${await nav("admin")}
    </div>
  `;
}

async function createService() {
  const name = prompt("Название услуги:");
  if (!name) return;

  const description = prompt("Описание услуги:", "");
  const duration = parseMoney(prompt("Длительность в минутах:", "45"), 45);
  const price = parseMoney(prompt("Цена в zł:", "120"), 120);
  const icon = prompt("Иконка/эмодзи:", "✂️");

  alert("Сейчас выбери фото услуги из галереи телефона или ПК.");
  const image = await chooseImageFromDevice();

  try {
    await api(`/admin/services?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "POST",
      body: JSON.stringify({ name, description, duration, price, icon, image, is_active: 1 })
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
  const duration = parseMoney(prompt("Длительность:", s.duration), s.duration);
  const price = parseMoney(prompt("Цена:", s.price), s.price);
  const icon = prompt("Иконка:", s.icon || "✂️");

  try {
    await api(`/admin/services/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name, description, duration, price, icon })
    });
    services = [];
    await loadCatalog(true);
    selectedService = services.find(item => Number(item.id) === Number(id)) || selectedService;
    await adminServices();
  } catch {
    alert("Не удалось изменить услугу.");
  }
}

async function changeServicePhoto(id) {
  alert("Выбери новое фото услуги из галереи телефона или ПК.");
  const image = await chooseImageFromDevice();
  if (!image) return;

  try {
    await api(`/admin/services/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ image })
    });
    services = [];
    await adminServices();
  } catch {
    alert("Не удалось заменить фото услуги.");
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
    await api(`/admin/services/${id}?telegram_id=${encodeURIComponent(user.id)}`, { method: "DELETE" });
    services = [];
    await adminServices();
  } catch {
    alert("Не удалось удалить услугу.");
  }
}

async function adminMasters() {
  await loadCatalog(true);

  app.innerHTML = `
    <div class="screen">
      <div class="header"><div class="back" onclick="home()">←</div><h2>Мастера</h2></div>
      ${adminMainTabs()}
      <button class="gold-btn" onclick="createMaster()">+ Добавить мастера</button>

      ${masters.map(m => `
        <div class="card admin-edit-card lift-card">
          <div class="master-avatar" style="background-image:url('${m.img || m.image || ""}')"></div>
          <div>
            <h3>${m.name}</h3>
            <p>${m.role}</p>
            <p><span class="price">★ ${m.rating}</span> (${m.reviews})</p>
            <p>${Number(m.is_active) === 1 ? "🟢 Активен" : "🔴 Скрыт"}</p>
            <button class="small-btn" onclick="editMaster(${m.id})">Редактировать</button>
            <button class="small-btn" onclick="changeMasterPhoto(${m.id})">Заменить фото</button>
            <button class="small-btn" onclick="openMasterHoursEditor(${m.id})">Часы работы</button>
            <button class="small-btn" onclick="toggleMaster(${m.id}, ${Number(m.is_active) === 1 ? 0 : 1})">${Number(m.is_active) === 1 ? "Скрыть" : "Показать"}</button>
            <button class="small-btn danger" onclick="deleteMaster(${m.id})">Удалить</button>
          </div>
        </div>
      `).join("")}

      ${await nav("admin")}
    </div>
  `;
}

async function createMaster() {
  const name = prompt("Имя мастера:");
  if (!name) return;

  const role = prompt("Роль/специализация:", "Барбер");
  const rating = prompt("Рейтинг:", "5.0");
  const reviews = parseMoney(prompt("Количество отзывов:", "0"), 0);

  alert("Сейчас выбери фото мастера из галереи телефона или ПК.");
  const image = await chooseImageFromDevice();

  try {
    await api(`/admin/masters?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "POST",
      body: JSON.stringify({ name, role, rating, reviews, image, is_active: 1 })
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
  const reviews = parseMoney(prompt("Количество отзывов:", m.reviews || 0), m.reviews || 0);

  try {
    await api(`/admin/masters/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name, role, rating, reviews })
    });
    masters = [];
    await adminMasters();
  } catch {
    alert("Не удалось изменить мастера.");
  }
}

async function changeMasterPhoto(id) {
  alert("Выбери новое фото мастера из галереи телефона или ПК.");
  const image = await chooseImageFromDevice();
  if (!image) return;

  try {
    await api(`/admin/masters/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ image })
    });
    masters = [];
    await adminMasters();
  } catch {
    alert("Не удалось заменить фото мастера.");
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
    await api(`/admin/masters/${id}?telegram_id=${encodeURIComponent(user.id)}`, { method: "DELETE" });
    masters = [];
    await adminMasters();
  } catch {
    alert("Не удалось удалить мастера.");
  }
}

async function openMasterHoursEditor(id) {
  const m = masters.find(item => Number(item.id) === Number(id));
  if (!m) return;

  editingMasterHoursId = id;
  editingMasterHoursName = m.name;
  masterHoursDraft = await api(`/admin/masters/${id}/hours?telegram_id=${encodeURIComponent(user.id)}`);
  renderMasterHoursEditor();
}

function changeDraftHour(dayLabel, field, value) {
  masterHoursDraft = masterHoursDraft.map(item => {
    if (item.day_label !== dayLabel) return item;
    return { ...item, [field]: value };
  });
  renderMasterHoursEditor();
}

function stepDraftHour(dayLabel, field, minutes) {
  const item = masterHoursDraft.find(h => h.day_label === dayLabel);
  if (!item) return;
  const next = Math.max(0, Math.min(23 * 60, timeToMinutes(item[field]) + minutes));
  const value = `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
  changeDraftHour(dayLabel, field, value);
}

function toggleDraftWorking(dayLabel) {
  masterHoursDraft = masterHoursDraft.map(item => {
    if (item.day_label !== dayLabel) return item;
    return { ...item, is_working: Number(item.is_working) === 1 ? 0 : 1 };
  });
  renderMasterHoursEditor();
}

async function saveMasterHours() {
  try {
    await api(`/admin/masters/${editingMasterHoursId}/hours?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ hours: masterHoursDraft })
    });
    alert("Часы работы сохранены.");
    editingMasterHoursId = null;
    editingMasterHoursName = "";
    masterHoursDraft = [];
    await adminMasters();
  } catch {
    alert("Не удалось сохранить часы работы.");
  }
}

async function renderMasterHoursEditor() {
  app.innerHTML = `
    <div class="screen">
      <div class="header"><div class="back" onclick="adminMasters()">←</div><h2>Часы работы</h2></div>
      <p class="muted">${editingMasterHoursName}. Настрой без текста — кнопками.</p>

      ${masterHoursDraft.map(h => `
        <div class="schedule-card ${Number(h.is_working) === 1 ? "" : "off"}">
          <div class="schedule-head">
            <strong>${h.day_label}</strong>
            <button class="small-btn ${Number(h.is_working) === 1 ? "" : "danger"}" onclick="toggleDraftWorking('${h.day_label}')">
              ${Number(h.is_working) === 1 ? "Работает" : "Выходной"}
            </button>
          </div>

          <div class="hour-controls">
            <div>
              <span>Начало</span>
              <div class="stepper">
                <button onclick="stepDraftHour('${h.day_label}', 'start_time', -30)">−</button>
                <b>${h.start_time}</b>
                <button onclick="stepDraftHour('${h.day_label}', 'start_time', 30)">+</button>
              </div>
            </div>
            <div>
              <span>Конец</span>
              <div class="stepper">
                <button onclick="stepDraftHour('${h.day_label}', 'end_time', -30)">−</button>
                <b>${h.end_time}</b>
                <button onclick="stepDraftHour('${h.day_label}', 'end_time', 30)">+</button>
              </div>
            </div>
          </div>
        </div>
      `).join("")}

      <button class="gold-btn" onclick="saveMasterHours()">Сохранить график</button>
      ${await nav("admin")}
    </div>
  `;
}

async function adminSchedule() {
  await loadCatalog(true);

  if (!scheduleMasterId && masters.length) {
    scheduleMasterId = masters[0].id;
  }

  const days = getAdminCalendarDays(30);
  const start = days[0].date;
  const end = days[days.length - 1].date;
  const currentMaster = masters.find(m => Number(m.id) === Number(scheduleMasterId)) || masters[0];

  try {
    shopClosedDays = await api(`/shop-closed-days?start_date=${start}&end_date=${end}`);
  } catch {
    shopClosedDays = [];
  }

  if (currentMaster) {
    try {
      masterDayOffs = await api(`/admin/masters/${currentMaster.id}/day-offs?telegram_id=${encodeURIComponent(user.id)}&start_date=${start}&end_date=${end}`);
    } catch {
      masterDayOffs = [];
    }
  }

  app.innerHTML = `
    <div class="screen">
      <div class="header"><div class="back" onclick="home()">←</div><h2>График</h2></div>
      ${adminMainTabs()}

      <div class="details">
        <h3>Полные выходные заведения</h3>
        <p class="muted">Нажми на день — он станет выходным для всего барбершопа.</p>
        <div class="admin-calendar">
          ${days.map(d => {
            const closed = shopClosedDays.some(item => item.date === d.date);
            return `
              <button class="calendar-day ${closed ? "closed" : ""}" onclick="toggleShopClosedDay('${d.date}', ${closed ? 0 : 1})">
                <span>${d.label}</span><b>${d.day}</b><small>${d.month}</small>
              </button>
            `;
          }).join("")}
        </div>
      </div>

      <div class="details">
        <h3>Выходные мастера</h3>
        <div class="master-pills">
          ${masters.map(m => `
            <button class="pill ${Number(scheduleMasterId) === Number(m.id) ? "active" : ""}" onclick="selectScheduleMaster(${m.id})">${m.name}</button>
          `).join("")}
        </div>
        <p class="muted">Нажми на день — у выбранного мастера будет выходной.</p>
        <div class="admin-calendar">
          ${days.map(d => {
            const off = masterDayOffs.some(item => item.date === d.date);
            return `
              <button class="calendar-day ${off ? "master-off" : ""}" onclick="toggleMasterDayOff('${d.date}', ${off ? 0 : 1})">
                <span>${d.label}</span><b>${d.day}</b><small>${d.month}</small>
              </button>
            `;
          }).join("")}
        </div>
      </div>

      ${await nav("admin")}
    </div>
  `;
}

function selectScheduleMaster(id) {
  scheduleMasterId = id;
  adminSchedule();
}

async function toggleShopClosedDay(date, value) {
  try {
    await api(`/admin/shop-closed-day?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ date, reason: value ? "Выходной заведения" : "", is_closed: value })
    });
    await adminSchedule();
  } catch {
    alert("Не удалось изменить выходной заведения.");
  }
}

async function toggleMasterDayOff(date, value) {
  if (!scheduleMasterId) return;

  try {
    await api(`/admin/masters/${scheduleMasterId}/day-off?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ date, reason: value ? "Выходной мастера" : "", is_off: value })
    });
    await adminSchedule();
  } catch {
    alert("Не удалось изменить выходной мастера.");
  }
}

async function adminWorks() {
  await loadWorkPhotos(true);

  app.innerHTML = `
    <div class="screen">
      <div class="header"><div class="back" onclick="home()">←</div><h2>Фото работ</h2></div>
      ${adminMainTabs()}
      <button class="gold-btn" onclick="createWorkPhoto()">+ Добавить фото работы</button>

      ${workPhotos.map(p => `
        <div class="card admin-edit-card lift-card">
          <div class="card-img" style="background-image:url('${p.img || p.image || ""}')"></div>
          <div>
            <h3>${p.title || "Работа мастера"}</h3>
            <p>${p.master ? `Мастер: ${p.master}` : "Без мастера"}</p>
            <p>${Number(p.is_active) === 1 ? "🟢 Показывается" : "🔴 Скрыта"}</p>
            <button class="small-btn" onclick="editWorkPhoto(${p.id})">Редактировать</button>
            <button class="small-btn" onclick="changeWorkPhotoImage(${p.id})">Заменить фото</button>
            <button class="small-btn" onclick="toggleWorkPhoto(${p.id}, ${Number(p.is_active) === 1 ? 0 : 1})">${Number(p.is_active) === 1 ? "Скрыть" : "Показать"}</button>
            <button class="small-btn danger" onclick="deleteWorkPhoto(${p.id})">Удалить</button>
          </div>
        </div>
      `).join("")}

      ${await nav("admin")}
    </div>
  `;
}

async function createWorkPhoto() {
  alert("Выбери фото работы из галереи телефона или ПК.");
  const image = await chooseImageFromDevice();
  if (!image) return;

  const title = prompt("Название/описание работы:", "Работа мастера");
  const master = prompt("Имя мастера:", "");

  try {
    await api(`/admin/work-photos?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "POST",
      body: JSON.stringify({ image, title, master, is_active: 1 })
    });
    workPhotos = [];
    await adminWorks();
  } catch {
    alert("Не удалось добавить фото работы.");
  }
}

async function editWorkPhoto(id) {
  const p = workPhotos.find(item => Number(item.id) === Number(id));
  if (!p) return;

  const title = prompt("Название/описание:", p.title || "");
  const master = prompt("Имя мастера:", p.master || "");

  try {
    await api(`/admin/work-photos/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ title, master })
    });
    workPhotos = [];
    await adminWorks();
  } catch {
    alert("Не удалось изменить фото работы.");
  }
}

async function changeWorkPhotoImage(id) {
  alert("Выбери новое фото работы из галереи телефона или ПК.");
  const image = await chooseImageFromDevice();
  if (!image) return;

  try {
    await api(`/admin/work-photos/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ image })
    });
    workPhotos = [];
    await adminWorks();
  } catch {
    alert("Не удалось заменить фото работы.");
  }
}

async function toggleWorkPhoto(id, value) {
  try {
    await api(`/admin/work-photos/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: value })
    });
    workPhotos = [];
    await adminWorks();
  } catch {
    alert("Не удалось изменить видимость фото.");
  }
}

async function deleteWorkPhoto(id) {
  if (!confirm("Удалить фото работы?")) return;

  try {
    await api(`/admin/work-photos/${id}?telegram_id=${encodeURIComponent(user.id)}`, { method: "DELETE" });
    workPhotos = [];
    await adminWorks();
  } catch {
    alert("Не удалось удалить фото работы.");
  }
}


async function adminAppAdmins() {
  try {
    const admins = await api(`/admin/app-admins?telegram_id=${encodeURIComponent(user.id)}`);

    app.innerHTML = `
      <div class="screen">
        <div class="header">
          <div class="back" onclick="home()">←</div>
          <h2>Админы</h2>
        </div>

        ${adminMainTabs()}

        <div class="details">
          <h3>Выдать админку</h3>
          <p class="muted">
            Пользователь должен сначала открыть Mini App хотя бы один раз.
            Потом сюда можно добавить его по @username.
          </p>
          <button class="gold-btn" onclick="addAppAdminByUsername()">+ Добавить админа по @username</button>
        </div>

        ${admins.length ? admins.map(a => `
          <div class="card lift-card">
            <div class="icon">♛</div>
            <div>
              <h3>${a.username ? "@" + a.username : a.first_name || "Админ"}</h3>
              <p>ID: ${a.telegram_id}</p>
              <p>${a.is_super_admin ? "Главный админ из Render ADMIN_IDS" : "Админ из панели"}</p>

              ${a.is_super_admin ? `
                <p class="price">Нельзя удалить из Mini App</p>
              ` : `
                <button class="small-btn danger" onclick="removeAppAdmin('${a.telegram_id}')">Снять админку</button>
              `}
            </div>
          </div>
        `).join("") : `<p class="muted">Админов пока нет</p>`}

        ${await nav("admin")}
      </div>
    `;
  } catch {
    alert("Не удалось загрузить список админов.");
  }
}

async function addAppAdminByUsername() {
  const username = prompt("Введи Telegram username без @ или с @:");

  if (!username) return;

  try {
    await api(`/admin/app-admins/by-username?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "POST",
      body: JSON.stringify({ username })
    });

    alert("Админка выдана.");
    adminCache = null;
    await adminAppAdmins();
  } catch {
    alert("Не удалось выдать админку. Пользователь должен сначала открыть Mini App хотя бы один раз.");
  }
}

async function removeAppAdmin(telegramId) {
  if (!confirm("Снять админку у этого пользователя?")) return;

  try {
    await api(`/admin/app-admins/${encodeURIComponent(telegramId)}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "DELETE"
    });

    alert("Админка снята.");
    adminCache = null;
    await adminAppAdmins();
  } catch {
    alert("Не удалось снять админку.");
  }
}


async function adminUsers() {
  try {
    const users = await api(`/admin/users?telegram_id=${encodeURIComponent(user.id)}`);

    app.innerHTML = `
      <div class="screen">
        <div class="header">
          <div class="back" onclick="home()">←</div>
          <h2>Клиенты</h2>
        </div>

        ${adminMainTabs()}

        ${users.length ? users.map(u => `
          <div class="card lift-card">
            <div class="icon">👤</div>
            <div>
              <h3>${u.full_name || u.first_name || "Без имени"}</h3>
              <p>Telegram: ${u.username ? `<a class="tg-link" href="https://t.me/${u.username}" target="_blank">@${u.username}</a>` : "нет username"}</p>
              <p>Телефон: <a class="tg-link" href="tel:${u.phone}">${u.phone || "не указан"}</a></p>
              <p>Email: <a class="tg-link" href="mailto:${u.email}">${u.email || "не указан"}</a></p>
              <p class="muted">ID: ${u.telegram_id}</p>
            </div>
          </div>
        `).join("") : `<p class="muted">Пользователей пока нет</p>`}

        ${await nav("admin")}
      </div>
    `;
  } catch {
    alert("Не удалось загрузить пользователей.");
  }
}