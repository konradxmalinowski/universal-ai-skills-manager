/**
 * Przyczyny, dla ktorych indeks moze nie dac sie otworzyc (ADR 0029).
 *
 * Rozroznienie nie jest ozdoba: dwie z tych przyczyn prowadza do odbudowy,
 * trzy do odmowy startu. Polityka reakcji siedzi w bootstrapie procesu
 * glownego, bo to decyzja produktowa, a nie szczegol dostepu do bazy.
 */
export type IndexFailureReason =
  'corrupted' | 'unknown-schema' | 'schema-from-future' | 'not-writable' | 'native-module';

export type IndexStartupOutcome = 'ready' | 'rebuilt' | 'refused';

export interface IndexStartupInfo {
  readonly outcome: IndexStartupOutcome;
  readonly reason?: IndexFailureReason;
  readonly message?: string;
  /** Zredagowana sciezka pliku odlozonego do kwarantanny, jesli byla. */
  readonly quarantinedAs?: string;
  /**
   * Ile elementow udalo sie wczytac z plikow przy odbudowie i czego nie dalo
   * sie odzyskac. W Etapie 1 odbudowa odtwarza pusty indeks, bo warstwa
   * biblioteki powstaje w Etapie 2 (ADR 0023) - raport mowi o tym wprost,
   * zamiast podawac zero jako sukces.
   */
  readonly restoredItems?: number;
  readonly notRestored?: readonly string[];
}
