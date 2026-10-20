import { describe, expect, it } from 'vitest';

import { IPC_CHANNELS, IPC_EVENTS, isIpcChannel } from '../../src/shared/ipc/channels';
import { bridgeSurfaceKeys, buildBridgeSurface } from '../../src/shared/ipc/surface';

function expectedKeys(): string[] {
  return IPC_CHANNELS.map((channel) => {
    const [namespace, rest] = channel.split(':');
    const member = (rest ?? '').replace(/-([a-z])/g, (_m, letter: string) => letter.toUpperCase());
    return `${namespace ?? ''}.${member}`;
  })
    .concat(
      IPC_EVENTS.map((event) => `events.on${event === 'progress' ? 'Progress' : 'OperationLog'}`),
    )
    .sort();
}

describe('most IPC wystawia dokladnie zamknieta liste kanalow', () => {
  const calls: string[] = [];
  const surface = buildBridgeSurface(
    (channel) => {
      calls.push(channel);
      return Promise.resolve(null);
    },
    () => () => undefined,
  );

  it('nie ma ani jednego klucza wiecej niz lista kanalow i zdarzen', () => {
    expect(bridgeSurfaceKeys(surface)).toEqual(expectedKeys());
  });

  it('nie wystawia kanalu ogolnego przyjmujacego dowolna nazwe', () => {
    const topLevel = Object.keys(surface);
    expect(topLevel).not.toContain('invoke');
    expect(topLevel).not.toContain('send');
    expect(topLevel).not.toContain('ipcRenderer');
    for (const key of topLevel) {
      expect(typeof (surface as unknown as Record<string, unknown>)[key]).toBe('object');
    }
  });

  it('jest zamrozony na obu poziomach', () => {
    expect(Object.isFrozen(surface)).toBe(true);
    expect(Object.isFrozen(surface.diagnostics)).toBe(true);

    const mutable = surface as unknown as Record<string, unknown>;
    expect(() => {
      'use strict';
      mutable['fs'] = () => undefined;
    }).toThrow();
    expect(mutable['fs']).toBeUndefined();
  });

  it('kazda metoda wola swoj wlasny kanal', async () => {
    calls.length = 0;
    await surface.diagnostics.report();
    await surface.profiles.exportPlan();
    expect(calls).toEqual(['diagnostics:report', 'profiles:export-plan']);
  });

  it('kanal poza lista nie przechodzi przez straznik', () => {
    expect(isIpcChannel('fs:read')).toBe(false);
    expect(isIpcChannel('diagnostics:report')).toBe(true);
  });
});
