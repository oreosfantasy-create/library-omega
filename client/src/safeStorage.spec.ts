import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readVerifiedFlag,
  removeStorage,
  writeStorage,
  writeVerifiedFlag,
} from "@/lib/safeStorage";

describe("safeStorage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("guarda la verificación en sesión y la recupera", () => {
    writeVerifiedFlag();
    expect(readVerifiedFlag()).toBe(true);
    expect(window.sessionStorage.getItem("omega_verified")).toBe("true");
  });

  it("usa localStorage si sessionStorage está bloqueado", () => {
    const nativeSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (this === window.sessionStorage) throw new Error("session storage blocked");
      nativeSetItem.call(this, key, value);
    });

    writeVerifiedFlag();

    expect(window.localStorage.getItem("omega_verified")).toBe("true");
    expect(readVerifiedFlag()).toBe(true);
  });

  it("no lanza errores al retirar una preferencia", () => {
    writeStorage("omega_lock_until", "123", "local");
    expect(window.localStorage.getItem("omega_lock_until")).toBe("123");
    removeStorage("omega_lock_until", "local");
    expect(window.localStorage.getItem("omega_lock_until")).toBeNull();
  });
});
