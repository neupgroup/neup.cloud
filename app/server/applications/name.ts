export function normalizeApplicationNameInput(value: string) {
  return value.slice(0, 64);
}