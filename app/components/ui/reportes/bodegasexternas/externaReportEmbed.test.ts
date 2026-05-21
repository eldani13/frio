import { describe, expect, it } from "vitest";
import { getExternaReportEmbedUrl } from "./externaReportEmbed";

describe("externaReportEmbed", () => {
  it("devuelve URL para 000GX", () => {
    const url = getExternaReportEmbedUrl("000GX");
    expect(url).toContain("datastudio.google.com/embed/reporting/");
    expect(url).toContain("e86c7eba-f669-499f-9666-0655492d5e66");
  });

  it("otras cuentas sin embed", () => {
    expect(getExternaReportEmbedUrl("MIT00")).toBeNull();
  });
});
