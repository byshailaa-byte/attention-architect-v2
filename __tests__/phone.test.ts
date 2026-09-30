import { describe, it, expect } from "vitest";
import { normalizePhone, maskPhone } from "@/lib/phone";

describe("normalizePhone — every format seen in prod", () => {
  it("10-digit local -> +91 + 10", () => {
    expect(normalizePhone("9876543210")).toBe("+919876543210");
  });
  it("+91XXXXXXXXXX -> unchanged shape", () => {
    expect(normalizePhone("+919876543210")).toBe("+919876543210");
  });
  it("91XXXXXXXXXX (12 digits) -> +91 + 10", () => {
    expect(normalizePhone("919876543210")).toBe("+919876543210");
  });
  it("0XXXXXXXXXX (leading 0) -> +91 + 10", () => {
    expect(normalizePhone("09876543210")).toBe("+919876543210");
  });
  it("formatted with spaces/dashes -> normalised", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("+919876543210");
    expect(normalizePhone("98765 43210")).toBe("+919876543210");
  });
  it("null / empty -> null", () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("   ")).toBeNull();
  });
  it("junk (9-digit, 24-digit) -> null", () => {
    expect(normalizePhone("987654321")).toBeNull();          // 9 digits
    expect(normalizePhone("123456789012345678901234")).toBeNull(); // 24 digits
  });
});

describe("maskPhone", () => {
  it("masks the middle, keeps first 2 + last 3", () => {
    expect(maskPhone("+919876543210")).toBe("+91 98••• ••210");
  });
  it("null -> dash", () => {
    expect(maskPhone(null)).toBe("—");
  });
});
