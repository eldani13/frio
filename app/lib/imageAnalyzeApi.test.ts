import { describe, expect, it } from "vitest";
import { temperatureStringFromAnalyzeResponse } from "./imageAnalyzeApi";

describe("imageAnalyzeApi", () => {
  it("toma numbersDetected legacy", () => {
    expect(temperatureStringFromAnalyzeResponse({ numbersDetected: ["3,5"] })).toBe("3.5");
  });

  it("toma temperature moderno", () => {
    expect(temperatureStringFromAnalyzeResponse({ temperature: "4,25" })).toBe("4.25");
    expect(temperatureStringFromAnalyzeResponse({ temperature: null })).toBeNull();
    expect(temperatureStringFromAnalyzeResponse({ temperature: "N/A" })).toBeNull();
  });

  it("retorna null con payload invalido", () => {
    expect(temperatureStringFromAnalyzeResponse(null)).toBeNull();
    expect(temperatureStringFromAnalyzeResponse("x")).toBeNull();
  });
});
