import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/formatDate";

describe("formatDate", () => {
  it("renders an ISO calendar date as MM/DD/YYYY", () => {
    expect(formatDate("2015-04-01")).toBe("04/01/2015");
  });

  it("renders an ISO datetime's date portion as MM/DD/YYYY", () => {
    expect(formatDate("2015-04-01T00:00:00.000Z")).toBe("04/01/2015");
  });

  it("returns an empty string for null/undefined", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("returns the input unchanged if it isn't a recognizable ISO date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});
