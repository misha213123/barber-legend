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

function generateBookingDays(daysCount = 30) {
  const days = [];

  for (let i = 0; i < daysCount; i++) {
    const date = new Date();

    date.setDate(date.getDate() + i);

    days.push({
      label: formatDateLabel(date),
      number: date.getDate(),
      full: formatDateFull(date),
      raw: date.toISOString().split("T")[0]
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