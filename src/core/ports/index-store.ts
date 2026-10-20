import type { DatabaseProbe } from '../model/diagnostics';

/**
 * Port indeksu metadanych. Implementacja siedzi w `infra/db` i tylko ona wie
 * o SQLite (ADR 0007). Wymiana silnika jest zmiana jednej implementacji portu.
 */
export interface IndexStore {
  probe(): DatabaseProbe;
  close(): void;
}

export interface IndexStoreFactory {
  open(): IndexStore;
}
