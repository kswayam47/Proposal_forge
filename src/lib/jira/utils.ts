import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoM(changePct: number | null): {
  text: string;
  direction: "up" | "down" | "flat";
  positive: boolean;
} {
  if (changePct === null) {
    return { text: "—", direction: "flat", positive: true };
  }
  const direction: "up" | "down" | "flat" =
    changePct > 0.05 ? "up" : changePct < -0.05 ? "down" : "flat";
  const sign = changePct > 0 ? "+" : "";
  return {
    text: `${sign}${changePct.toFixed(1)}%`,
    direction,
    positive: changePct >= 0,
  };
}

export function formatNumber(n: number, decimals = 1): string {
  if (n === null || n === undefined) return "—";
  return n.toFixed(decimals);
}
