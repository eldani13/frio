import { describe, expect, it } from "vitest";
import { formatKgEs, parseDecimalEs } from "./decimalEs";

describe("decimalEs", () => {
  it("parseDecimalEs acepta coma decimal", () => {
    expect(parseDecimalEs("15,6")).toBe(15.6);
  });

  it("parseDecimalEs acepta punto decimal y espacios", () => {
    expect(parseDecimalEs("  20.25 ")).toBe(20.25);
  });

  it("parseDecimalEs retorna null en valores vacios/no validos", () => {
    expect(parseDecimalEs("")).toBeNull();
    expect(parseDecimalEs("-" )).toBeNull();
    expect(parseDecimalEs("abc")).toBeNull();
  });

  it("formatKgEs formatea en es-CO", () => {
    const out = formatKgEs(1234.5);
    expect(out).toContain("1");
    expect(out).toContain("234");
  });
});
