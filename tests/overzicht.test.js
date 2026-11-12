import { describe, it, expect } from "vitest";

import { periode } from "../diensten/overzichtDienst.js";

describe("periode van het overzicht", () => {
  it("is zonder keuze de laatste 30 dagen, vandaag meegeteld", () => {
    expect(periode({}, "2026-11-30")).toEqual({ van: "2026-11-01", tot: "2026-11-30" });
  });

  it("neemt een gekozen periode over", () => {
    expect(periode({ van: "2026-10-01", tot: "2026-10-31" }, "2026-11-30")).toEqual({
      van: "2026-10-01",
      tot: "2026-10-31",
    });
  });

  it("weigert van na tot", () => {
    expect(() => periode({ van: "2026-11-02", tot: "2026-11-01" })).toThrow(/voor 'tot'/);
  });

  it("weigert meer dan een jaar", () => {
    expect(() => periode({ van: "2025-01-01", tot: "2026-11-01" })).toThrow(/maximaal een jaar/);
  });
});
