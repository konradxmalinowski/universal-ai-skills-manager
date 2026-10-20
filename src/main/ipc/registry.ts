import { IMPLEMENTED_CHANNELS, type IpcChannel, isIpcChannel } from '../../shared/ipc/channels';

/**
 * Minimalny kontrakt na `ipcMain.handle`. Rejestr nie importuje Electrona,
 * zeby dal sie przetestowac jednostkowo bez uruchamiania aplikacji.
 */
export interface IpcHandleTarget {
  handle(channel: string, listener: (event: unknown, payload: unknown) => unknown): void;
}

export type IpcHandler = (payload: unknown) => unknown;

export class IpcRegistry {
  private readonly registered = new Set<IpcChannel>();

  constructor(private readonly target: IpcHandleTarget) {}

  register(channel: IpcChannel, handler: IpcHandler): void {
    if (!isIpcChannel(channel)) {
      throw new Error(
        `odmowa rejestracji: kanal "${String(channel)}" nie jest na zamknietej liscie IPC`,
      );
    }
    if (this.registered.has(channel)) {
      throw new Error(`odmowa rejestracji: kanal "${channel}" jest juz zarejestrowany`);
    }
    this.registered.add(channel);
    this.target.handle(channel, (_event: unknown, payload: unknown) => handler(payload));
  }

  list(): IpcChannel[] {
    return [...this.registered].sort();
  }

  /**
   * Lista kanalow zadeklarowanych jako zaimplementowane w tym etapie musi sie
   * pokrywac z tym, co faktycznie zarejestrowano. Inaczej deklaracja w
   * `channels.ts` rozjechalaby sie z rzeczywistoscia po cichu.
   */
  assertImplementedRegistered(): void {
    const missing = IMPLEMENTED_CHANNELS.filter((channel) => !this.registered.has(channel));
    if (missing.length > 0) {
      throw new Error(`kanaly zadeklarowane jako gotowe bez handlera: ${missing.join(', ')}`);
    }
  }
}
