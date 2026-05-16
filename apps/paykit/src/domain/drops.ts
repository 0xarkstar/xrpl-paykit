// PRD v0.2 §8.1 — XRP <-> drops safe conversion. String-based, no float.

const AMOUNT_RE = /^(0|[1-9][0-9]*)(\.[0-9]{1,6})?$/;

export class AmountFormatError extends Error {}

export function isValidXrpAmount(s: string): boolean {
  return typeof s === "string" && AMOUNT_RE.test(s) && parseFloat(s) > 0;
}

export function xrpToDropsString(xrp: string): string {
  if (!AMOUNT_RE.test(xrp)) {
    throw new AmountFormatError(`invalid_xrp_format: ${xrp}`);
  }
  const [whole, frac = ""] = xrp.split(".");
  if (whole === undefined) throw new AmountFormatError("invalid_xrp_format");
  const fracPadded = (frac + "000000").slice(0, 6);
  const dropsBig = BigInt(whole + fracPadded);
  if (dropsBig <= 0n) {
    throw new AmountFormatError("amount_must_be_positive");
  }
  return dropsBig.toString();
}

export function dropsToXrpString(drops: string): string {
  if (!/^[0-9]+$/.test(drops)) throw new AmountFormatError(`invalid_drops: ${drops}`);
  const padded = drops.padStart(7, "0");
  const whole = padded.slice(0, -6);
  const frac = padded.slice(-6).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}
