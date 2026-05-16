// PRD §8.5 — state transitions.

import { describe, it, expect } from "vitest";
import { assertTransition, canTransition, isTerminal } from "../src/domain/payment-intent-state";

describe("payment intent state machine", () => {
  it("allows created → pending", () => {
    expect(canTransition("created", "pending")).toBe(true);
  });

  it("disallows succeeded → anywhere", () => {
    expect(canTransition("succeeded", "pending")).toBe(false);
    expect(canTransition("succeeded", "failed")).toBe(false);
  });

  it("allows expired → requires_review", () => {
    expect(canTransition("expired", "requires_review")).toBe(true);
  });

  it("isTerminal", () => {
    expect(isTerminal("succeeded")).toBe(true);
    expect(isTerminal("failed")).toBe(true);
    expect(isTerminal("pending")).toBe(false);
  });

  it("assertTransition throws on invalid", () => {
    expect(() => assertTransition("succeeded", "created")).toThrowError(/invalid_transition/);
  });
});
