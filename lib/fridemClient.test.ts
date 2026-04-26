import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("fridemClient", () => {
  it("crea app fridem y expone clientes", async () => {
    const app = { name: "fridem" };
    const auth = { currentUser: null };
    const signIn = vi.fn(async () => {});

    vi.stubEnv("NEXT_PUBLIC_FRIDEM_DATABASE_URL", "https://x.test");
    vi.doMock("firebase/app", () => ({
      getApps: () => [],
      initializeApp: () => app,
    }));
    vi.doMock("firebase/firestore", () => ({ getFirestore: () => ({}) }));
    vi.doMock("firebase/database", () => ({ getDatabase: () => ({}) }));
    vi.doMock("firebase/auth", () => ({ getAuth: () => auth, signInAnonymously: signIn }));

    const mod = await import("./fridemClient");
    expect(mod.fridemDb).not.toBeNull();
    expect(mod.fridemDatabase).not.toBeNull();
    await mod.ensureFridemAuth();
    expect(signIn).toHaveBeenCalled();
  });

  it("no reloguea si ya hay currentUser", async () => {
    const app = { name: "fridem" };
    const auth = { currentUser: { uid: "u1" } };
    const signIn = vi.fn(async () => {});

    vi.doMock("firebase/app", () => ({
      getApps: () => [],
      initializeApp: () => app,
    }));
    vi.doMock("firebase/firestore", () => ({ getFirestore: () => ({}) }));
    vi.doMock("firebase/database", () => ({ getDatabase: () => ({}) }));
    vi.doMock("firebase/auth", () => ({ getAuth: () => auth, signInAnonymously: signIn }));

    const mod = await import("./fridemClient");
    await mod.ensureFridemAuth();
    expect(signIn).not.toHaveBeenCalled();
  });
});
