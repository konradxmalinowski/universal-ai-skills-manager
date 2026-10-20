/**
 * Redakcja sciezek przed oddaniem ich poza proces glowny. Katalog domowy
 * zamieniamy na `~`, bo zawiera nazwe konta uzytkownika, a raport
 * diagnostyczny ma dac sie wkleic do zgloszenia bledu (ADR 0004).
 */
export function redactHomePath(value: string, homeDir: string): string {
  if (homeDir.length === 0) return value;
  const normalizedHome = homeDir.replace(/[\\/]+$/, '');
  if (normalizedHome.length === 0) return value;
  if (value === normalizedHome) return '~';
  const withSeparator = `${normalizedHome}${value.includes('\\') ? '\\' : '/'}`;
  if (value.startsWith(withSeparator)) {
    return `~${value.slice(normalizedHome.length)}`;
  }
  if (value.startsWith(normalizedHome)) {
    return `~${value.slice(normalizedHome.length)}`;
  }
  return value;
}
