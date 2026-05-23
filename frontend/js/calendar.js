const CALENDAR_DAYS_COUNT = 30;

function formatDateLabel(date) {
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  return days[date.getDay()];
}

function formatDateFull(date) {
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long"
  });
}

function formatDateMonth(date) {
  return date.toLocaleDateString("ru-RU", {
    month: "short"
  }).replace(".", "");
}

function generateBookingDays() {
  const days = [];

  for (let i = 0; i < CALENDAR_DAYS_COUNT; i++) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + i);

    const raw = date.toISOString().split("T")[0];

    days.push({
      label: formatDateLabel(date),
      number: date.getDate(),
      month: formatDateMonth(date),
      full: formatDateFull(date),
      raw,
      isPast: false
    });
  }

  return days;
}

function isPastDate(rawDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(rawDate);
  date.setHours(0, 0, 0, 0);

  return date < today;
}