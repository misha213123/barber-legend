async function admin() {
  haptic();

  const adminAccess = await isAdminUser();

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

function setAdminSection(section) {
  adminSection = section;
  admin();
}

function setAdminMode(mode) {
  adminMode = mode;
  admin();
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
        `).join("") : `<p class="muted">Здесь пока пусто</p>`}

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
  const duration = Number(prompt("Длительность:", s.duration));
  const price = Number(prompt("Цена:", s.price));
  const icon = prompt("Иконка:", s.icon || "✂️");
  const image = prompt("Ссылка на фото:", s.img || s.image || "");

  try {
    await api(`/admin/services/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name, description, duration, price, icon, image })
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
  const reviews = Number(prompt("Количество отзывов:", m.reviews || 0));
  const image = prompt("Ссылка на фото:", m.img || m.image || "");

  try {
    await api(`/admin/masters/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name, role, rating, reviews, image })
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