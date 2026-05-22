import { describe, expect, it } from "vitest";
import { getExternaReportEmbedUrl } from "./externaReportEmbed";

describe("externaReportEmbed", () => {
  it("devuelve URL para 000GX", () => {
    const url = getExternaReportEmbedUrl("000GX");
    expect(url).toContain("datastudio.google.com/embed/reporting/");
    expect(url).toContain("8319190c-7a5c-48b2-9b1d-84701d583dd9");
    expect(url).toContain("/page/RMmyF");
  });

  it("otras cuentas sin embed", () => {
    expect(getExternaReportEmbedUrl("MIT00")).toBeNull();
  });
});
