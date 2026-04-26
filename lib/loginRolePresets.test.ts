import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("loginRolePresets", () => {
  it("devuelve defaults y habilita shortcuts en development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const mod = await import("./loginRolePresets");
    expect(mod.loginRoleShortcutsEnabled).toBe(true);
    const rows = mod.getLoginRoleShortcuts();
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.some((r) => r.label === "Custodio")).toBe(true);
  });

  it("aplica overrides por JSON/env", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_LOGIN_ROLE_SHORTCUTS", "1");
    vi.stubEnv("NEXT_PUBLIC_LOGIN_CUSTODIO_EMAIL", "cust@x.com");
    vi.stubEnv("NEXT_PUBLIC_BODEGA_DEV_LOGINS", JSON.stringify({ jefe: { email: "j@x.com", password: "abc" } }));

    const mod = await import("./loginRolePresets");
    expect(mod.loginRoleShortcutsEnabled).toBe(true);
    const rows = mod.getLoginRoleShortcuts();
    expect(rows.find((r) => r.label === "Custodio")?.email).toBe("cust@x.com");
    expect(rows.find((r) => r.label === "Jefe")?.email).toBe("j@x.com");
  });
});
