const MAX_COMPACT_LENGTH = 14;
const HOURS = /(\d+(?:\.\d+)?)\s*(?:h\b|hr|heures?|hours?|horas?|std|stunden?)/;
const MINUTES = /(\d+)\s*(?:min|minutes?|minutos?|minuten)/;

/**
 * Older imports stored a sentence (« Environ 35 minutes, plus 1 heure de réfrigération »)
 * that shrank to an unreadable size in the recipe card. Read it like the API's
 * parseDurationMinutes and show « 1 h 35 min »; short values are kept as written.
 */
export function compactCookingTime(value: string): string {
  if (value.length <= MAX_COMPACT_LENGTH) return value;
  const text = value.toLowerCase().replace(',', '.');
  const hours = text.match(HOURS), minutes = text.match(MINUTES);
  if (!hours && !minutes) return value;
  const total = Math.round((hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0));
  const wholeHours = Math.floor(total / 60), rest = total % 60;
  if (!wholeHours) return `${total} min`;
  return rest ? `${wholeHours} h ${rest} min` : `${wholeHours} h`;
}
