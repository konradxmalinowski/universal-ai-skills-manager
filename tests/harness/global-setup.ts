import { diffFingerprints, ensureTestBase, ownerFingerprint, resolveTestBase } from './isolation';

export default function setup(): () => void {
  const base = resolveTestBase();
  ensureTestBase(base);

  const before = ownerFingerprint();

  return () => {
    const changed = diffFingerprints(before, ownerFingerprint());
    if (changed.length > 0) {
      throw new Error(
        `konfiguracja wlasciciela zmienila sie w trakcie testow: ${changed.join(', ')}`,
      );
    }
  };
}
