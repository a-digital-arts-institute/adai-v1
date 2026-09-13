// ISO-8601 second precision, matching the schema's strftime defaults
// ('YYYY-MM-DDTHH:MM:SSZ') so string comparisons in SQL stay correct.

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function plusIso(ms: number, from: number = Date.now()): string {
  return new Date(from + ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
