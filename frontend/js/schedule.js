let salonClosedDays = [];

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(":").map(Number);

  return (hours * 60) + minutes;
}

function isTimeInsideWorkingHours(time) {
  if (!masterHours) return false;

  if (Number(masterHours.is_working) !== 1) return false;

  const current = timeToMinutes(time);

  const start = timeToMinutes(masterHours.start_time || "09:00");

  const end = timeToMinutes(masterHours.end_time || "20:00");

  return current >= start && current <= end;
}

function generateHoursOptions() {
  const result = [];

  for (let h = 6; h <= 23; h++) {
    result.push(`${String(h).padStart(2, "0")}:00`);
  }

  return result;
}

const HOUR_OPTIONS = generateHoursOptions();

function nextHour(value) {
  const index = HOUR_OPTIONS.indexOf(value);

  if (index === -1) return value;

  return HOUR_OPTIONS[Math.min(index + 1, HOUR_OPTIONS.length - 1)];
}

function prevHour(value) {
  const index = HOUR_OPTIONS.indexOf(value);

  if (index === -1) return value;

  return HOUR_OPTIONS[Math.max(index - 1, 0)];
}