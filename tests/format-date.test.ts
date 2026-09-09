import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "@/lib/formatDate";

describe("formatDate", () => {
  it("renders an ISO calendar date as DD/MM/YYYY", () => {
    expect(formatDate("2015-04-01")).toBe("01/04/2015");
  });

  it("renders an ISO datetime's date portion as DD/MM/YYYY", () => {
    expect(formatDate("2015-04-01T00:00:00.000Z")).toBe("01/04/2015");
  });

  it("disambiguates day and month correctly (not simply mirrored) for a date where both matter", () => {
    // 2025-01-30 -> 30/01/2025, per the mandate's own worked example.
    expect(formatDate("2025-01-30")).toBe("30/01/2025");
  });

  it("returns an empty string for null/undefined", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("returns the input unchanged if it isn't a recognizable ISO date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDateTime", () => {
  it("renders a Date as DD/MM/YYYY, HH:mm, deterministically (not locale-dependent)", () => {
    const d = new Date(2025, 0, 30, 9, 5);
    expect(formatDateTime(d)).toBe("30/01/2025, 09:05");
  });

  it("zero-pads single-digit day, month, hour and minute", () => {
    const d = new Date(2025, 8, 3, 4, 7);
    expect(formatDateTime(d)).toBe("03/09/2025, 04:07");
  });
});
