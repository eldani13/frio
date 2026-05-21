import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("firebaseClient", () => {
  it("inicializa app principal y expone auth/db/storage", async () => {
    const appMain = { name: "[DEFAULT]" };
    const authObj = { t: "auth" };
    const dbObj = { t: "db" };
    const stObj = { t: "st" };

    vi.doMock("firebase/app", () => ({
      getApps: () => [],
      getApp: () => appMain,
      initializeApp: () => appMain,
    }));
    vi.doMock("firebase/auth", () => ({ getAuth: () => authObj }));
    vi.doMock("firebase/firestore", () => ({ getFirestore: () => dbObj }));
    vi.doMock("firebase/storage", () => ({ getStorage: () => stObj }));

    const mod = await import("./firebaseClient");
    expect(mod.auth).toBe(authObj);
    expect(mod.db).toBe(dbObj);
    expect(mod.storage).toBe(stObj);
  });

  it("getSecondaryAuth usa app Secondary existente o la crea", async () => {
    const main = { name: "[DEFAULT]" };
    const apps = [main] as Array<{ name: string }>;

    const init = vi.fn((_cfg: unknown, name?: string) => {
      const app = { name: name ?? "[DEFAULT]" };
      apps.push(app);
      return app;
    });
    const getAuth = vi.fn((app: unknown) => ({ app }));

    vi.doMock("firebase/app", () => ({
      getApps: () => apps,
      getApp: () => main,
      initializeApp: init,
    }));
    vi.doMock("firebase/auth", () => ({ getAuth }));
    vi.doMock("firebase/firestore", () => ({ getFirestore: () => ({}) }));
    vi.doMock("firebase/storage", () => ({ getStorage: () => ({}) }));

    const mod = await import("./firebaseClient");

    const first = mod.getSecondaryAuth();
    expect((first as { app: { name: string } }).app.name).toBe("Secondary");

    const second = mod.getSecondaryAuth();
    expect((second as { app: { name: string } }).app.name).toBe("Secondary");
    expect(init).toHaveBeenCalledTimes(1);
  });
});
