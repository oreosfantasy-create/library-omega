export type StorageArea = "session" | "local";

function getStorage(area: StorageArea): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return area === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function readStorage(key: string, area: StorageArea): string | null {
  try {
    return getStorage(area)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string, area: StorageArea): boolean {
  try {
    const storage = getStorage(area);
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string, area: StorageArea): void {
  try {
    getStorage(area)?.removeItem(key);
  } catch {
    // Algunos navegadores pueden revocar el acceso entre lecturas y escrituras.
  }
}

export function readVerifiedFlag(): boolean {
  return readStorage("omega_verified", "session") === "true" || readStorage("omega_verified", "local") === "true";
}

export function writeVerifiedFlag(): void {
  if (!writeStorage("omega_verified", "true", "session")) {
    writeStorage("omega_verified", "true", "local");
  }
}
