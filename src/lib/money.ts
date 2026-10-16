export function centsToPounds(cents: number): string {
  return (cents / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

export function poundsInputToCents(value: string): number | null {
  const cleaned = value.replace(/£/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function formatQuantity(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, "");
}
