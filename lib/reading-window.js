const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
});

export function readingWindow(samples, times, limit) {
  const readings = (Array.isArray(samples) ? samples : []).flatMap((value, index) =>
    Number.isFinite(value) ? [{ value, time: times?.[index] }] : []);
  const window = limit ? readings.slice(-limit) : readings;
  const points = window.map(reading => reading.value);
  const offset = readings.length - window.length;
  const dates = window.map(reading => typeof reading.time === 'string' ? Date.parse(reading.time) : NaN);
  const dated = dates.length > 0 && dates.every((date, index) =>
    Number.isFinite(date) && (index === 0 || date >= dates[index - 1]));
  let period = 'Timestamps unavailable · readings are not a time interval';
  if (dated) {
    const minutes = (dates.at(-1) - dates[0]) / 60000;
    const duration = minutes < 1 ? 'Less than 1 min' : minutes < 60 ? `${Math.round(minutes)} min`
      : minutes < 1440 ? `${Number((minutes / 60).toFixed(1))} hours` : `${Number((minutes / 1440).toFixed(1))} days`;
    period = dates.length === 1 ? `${dateTime.format(dates[0])} UTC`
      : `${duration} · ${dateTime.format(dates[0])} – ${dateTime.format(dates.at(-1))} UTC`;
  }
  return { points, offset, period, dates: dated ? dates : [] };
}
