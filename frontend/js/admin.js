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

  if (adminSection === "works") {
    await adminWorks();
    return;
  }

  await adminBookings();
}

function adminMainTabs() {
  return `
    <div class="admin-tabs four-tabs">
      <button class="${adminSection === "bookings" ? "tab active" : "tab"}" onclick="setAdminSection('bookings')">Записи</button>
      <button class="${adminSection === "services" ? "tab active" : "tab"}" onclick="setAdminSection('services')">Услуги</button>
      <button class="${adminSection === "masters" ? "tab active" : "tab"}" onclick="setAdminSection('masters')">Мастера</button>
      <button class="${adminSection === "works" ? "tab active" : "tab"}" onclick="setAdminSection('works')">Работы</button>
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

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

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
          <div class="card lift-card">
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
        <div class="card admin-edit-card lift-card">
          <div class="card-img" style="background-image:url('${s.img || s.image || ""}')"></div>
          <div>
            <h3>${s.name}</h3>
            <p>${s.desc || s.description || ""}</p>
            <p>${s.duration} мин · <span class="price">${s.price} zł</span></p>
            <p>${Number(s.is_active) === 1 ? "🟢 Активна" : "🔴 Скрыта"}</p>

            <button class="small-btn" onclick="editService(${s.id})">Редактировать</button>
            <button class="small-btn" onclick="changeServicePhoto(${s.id})">Заменить фото</button>
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
        <div class="card admin-edit-card lift-card">
          <div class="master-avatar" style="background-image:url('${m.img || m.image || ""}')"></div>
          <div>
            <h3>${m.name}</h3>
            <p>${m.role}</p>
            <p><span class="price">★ ${m.rating}</span> (${m.reviews})</p>
            <p>${Number(m.is_active) === 1 ? "🟢 Активен" : "🔴 Скрыт"}</p>

            <button class="small-btn" onclick="editMaster(${m.id})">Редактировать</button>
            <button class="small-btn" onclick="changeMasterPhoto(${m.id})">Заменить фото</button>
            <button class="small-btn" onclick="editMasterHours(${m.id})">Часы работы</button>
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

async function adminWorks() {
  await loadWorkPhotos(true);

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="home()">←</div>
        <h2>Фото работ</h2>
      </div>

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
            <button class="small-btn" onclick="toggleWorkPhoto(${p.id}, ${Number(p.is_active) === 1 ? 0 : 1})">
              ${Number(p.is_active) === 1 ? "Скрыть" : "Показать"}
            </button>
            <button class="small-btn danger" onclick="deleteWorkPhoto(${p.id})">Удалить</button>
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
  const duration = Number(prompt("Длительность:", s.duration));
  const price = Number(prompt("Цена:", s.price));
  const icon = prompt("Иконка:", s.icon || "✂️");

  try {
    await api(`/admin/services/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name, description, duration, price, icon })
    });

    services = [];
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
  const reviews = Number(prompt("Количество отзывов:", m.reviews || 0));

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

async function editMasterHours(id) {
  const m = masters.find(item => Number(item.id) === Number(id));
  if (!m) return;

  try {
    const currentHours = await api(`/admin/masters/${id}/hours?telegram_id=${encodeURIComponent(user.id)}`);
    const nextHours = [];

    for (const h of currentHours) {
      const workingAnswer = prompt(`${m.name}: ${h.day_label}. Работает? 1 = да, 0 = нет`, String(h.is_working));
      if (workingAnswer === null) return;

      const startTime = prompt(`${m.name}: ${h.day_label}. Начало работы:`, h.start_time || "09:00");
      if (startTime === null) return;

      const endTime = prompt(`${m.name}: ${h.day_label}. Конец работы:`, h.end_time || "20:00");
      if (endTime === null) return;

      nextHours.push({
        day_label: h.day_label,
        start_time: startTime || "09:00",
        end_time: endTime || "20:00",
        is_working: Number(workingAnswer) === 1 ? 1 : 0
      });
    }

    await api(`/admin/masters/${id}/hours?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ hours: nextHours })
    });

    alert("Часы работы сохранены.");
    await adminMasters();
  } catch {
    alert("Не удалось сохранить часы работы.");
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
    await api(`/admin/work-photos/${id}?telegram_id=${encodeURIComponent(user.id)}`, {
      method: "DELETE"
    });

    workPhotos = [];
    await adminWorks();
  } catch {
    alert("Не удалось удалить фото работы.");
  }
}