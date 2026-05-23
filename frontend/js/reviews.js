async function loadMyReviews() {
  try {
    myReviews = await api(`/reviews/my?telegram_id=${encodeURIComponent(user.id)}`);
  } catch {
    myReviews = [];
  }

  return myReviews;
}

function hasReviewForBooking(bookingId) {
  return myReviews.some(r => Number(r.booking_id) === Number(bookingId));
}

function starsHtml(value = 0) {
  const rating = Number(value || 0);

  return [1, 2, 3, 4, 5].map(i => {
    return `<span class="${i <= rating ? "star active" : "star"}">★</span>`;
  }).join("");
}

async function openReviewScreen(bookingId) {
  haptic();

  const bookings = await api(`/bookings/${user.id}`);
  const booking = bookings.find(item => Number(item.id) === Number(bookingId));

  if (!booking) {
    alert("Запись не найдена.");
    return;
  }

  app.innerHTML = `
    <div class="screen">
      <div class="header">
        <div class="back" onclick="myBookings()">←</div>
        <h2>Оценить визит</h2>
      </div>

      <div class="details">
        <h3>${booking.service}</h3>
        <p class="muted">Мастер: ${booking.master}</p>
        <p class="muted">${formatDisplayDate(booking.date)} · ${booking.time}</p>
      </div>

      <div class="review-box">
        <h3>Твоя оценка</h3>

        <div class="review-stars">
          ${[1, 2, 3, 4, 5].map(i => `
            <button onclick="selectReviewRating(${i})" id="reviewStar${i}">★</button>
          `).join("")}
        </div>

        <textarea id="reviewComment" class="form-textarea" placeholder="Комментарий по желанию"></textarea>

        <button class="gold-btn" onclick="submitReview(${booking.id})">Отправить отзыв</button>
      </div>

      ${await nav("my")}
    </div>
  `;

  selectReviewRating(5);
}

let selectedReviewRating = 5;

function selectReviewRating(value) {
  selectedReviewRating = value;

  [1, 2, 3, 4, 5].forEach(i => {
    const el = document.getElementById(`reviewStar${i}`);
    if (!el) return;

    if (i <= value) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });
}

async function submitReview(bookingId) {
  const comment = document.getElementById("reviewComment")?.value || "";

  try {
    await api("/reviews", {
      method: "POST",
      body: JSON.stringify({
        booking_id: bookingId,
        telegram_id: String(user.id),
        rating: selectedReviewRating,
        comment
      })
    });

    alert("Спасибо за отзыв!");
    myReviews = [];
    services = [];
    masters = [];
    await myBookings();
  } catch {
    alert("Не удалось отправить отзыв. Возможно, он уже был оставлен.");
  }
}