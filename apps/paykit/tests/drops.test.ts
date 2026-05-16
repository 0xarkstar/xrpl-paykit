// PRD §8.1 — amount/drops validation 거부 예시 모두 통과해야 함.

import { describe, it, expect } from "vitest";
import { xrpToDropsString, dropsToXrpString, isValidXrpAmount, AmountFormatError } from "../src/domain/drops";

describe("xrpToDropsString", () => {
  it("converts whole numbers", () => {
    expect(xrpToDropsString("1")).toBe("1000000");
    expect(xrpToDropsString("10")).toBe("10000000");
  });

  it("converts decimals up to 6 places", () => {
    expect(xrpToDropsString("1.25")).toBe("1250000");
    expect(xrpToDropsString("0.000001")).toBe("1");
  });

  it.each([
    ["-1"],
    ["1e-6"],
    ["1,000"],
    ["0"],
    ["0.0000001"],
    [""],
    [" "],
    ["abc"],
  ])("rejects %s", (input) => {
    expect(() => xrpToDropsString(input)).toThrowError(AmountFormatError);
  });
});

describe("dropsToXrpString", () => {
  it("converts drops back to XRP", () => {
    expect(dropsToXrpString("1000000")).toBe("1");
    expect(dropsToXrpString("1250000")).toBe("1.25");
    expect(dropsToXrpString("1")).toBe("0.000001");
  });
});

describe("isValidXrpAmount", () => {
  it("accepts valid", () => {
    expect(isValidXrpAmount("1")).toBe(true);
    expect(isValidXrpAmount("1.25")).toBe(true);
  });
  it("rejects invalid", () => {
    expect(isValidXrpAmount("0")).toBe(false);
    expect(isValidXrpAmount("1e-6")).toBe(false);
    expect(isValidXrpAmount("0.0000001")).toBe(false);
  });
});
