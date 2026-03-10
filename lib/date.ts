const TURKISH_DATE_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
  year: "numeric"
});

export function getTurkeyDateISO() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(new Date());
}

export function formatTurkishDate(dateISO: string) {
  return TURKISH_DATE_FORMATTER.format(new Date(`${dateISO}T00:00:00`));
}

export function getDaysUntilDate(todayISO: string, targetISO: string) {
  const [todayYear, todayMonth, todayDay] = todayISO.split("-").map(Number);
  const [targetYear, targetMonth, targetDay] = targetISO.split("-").map(Number);
  const today = Date.UTC(todayYear, todayMonth - 1, todayDay);
  const target = Date.UTC(targetYear, targetMonth - 1, targetDay);

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}
