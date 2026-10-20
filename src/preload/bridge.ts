import { contextBridge, ipcRenderer } from 'electron';

import { type IpcChannel, type IpcEvent, isIpcChannel, isIpcEvent } from '../shared/ipc/channels';
import { buildBridgeSurface } from '../shared/ipc/surface';

const BRIDGE_KEY = 'uasm';

function invoke(channel: IpcChannel, payload?: unknown): Promise<unknown> {
  if (!isIpcChannel(channel)) {
    return Promise.reject(new Error(`kanal IPC poza zamknieta lista: ${String(channel)}`));
  }
  return ipcRenderer.invoke(channel, payload);
}

function subscribe(event: IpcEvent, listener: (data: unknown) => void): () => void {
  if (!isIpcEvent(event)) {
    throw new Error(`zdarzenie IPC poza zamknieta lista: ${String(event)}`);
  }
  const wrapped = (_source: unknown, data: unknown): void => {
    listener(data);
  };
  ipcRenderer.on(event, wrapped);
  return () => {
    ipcRenderer.off(event, wrapped);
  };
}

contextBridge.exposeInMainWorld(BRIDGE_KEY, buildBridgeSurface(invoke, subscribe));
