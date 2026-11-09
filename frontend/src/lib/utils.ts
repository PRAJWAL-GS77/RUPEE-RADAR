import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupee(amount: number, compact = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "₹0";

  if (compact) {
    if (Math.abs(amount) >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    }
    if (Math.abs(amount) >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (Math.abs(amount) >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}k`;
    }
  }

  // Standard Indian comma separator (lakhs/crores)
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export const CATEGORY_COLORS: Record<string, string> = {
  "Food Delivery": "#F59E0B",
  "Dining Out": "#EC4899",
  "Groceries": "#10B981",
  "Transport": "#3B82F6",
  "Fuel": "#EF4444",
  "Rent": "#8B5CF6",
  "Utilities": "#06B6D4",
  "EMI/Loans": "#6366F1",
  "Subscriptions": "#F43F5E",
  "Shopping": "#D946EF",
  "Entertainment": "#84CC16",
  "Health": "#14B8A6",
  "Travel": "#F97316",
  "Cash Withdrawal": "#64748B",
  "Income": "#22C55E",
  "Transfers": "#A855F7",
  "Other": "#94A3B8",
};

export const CATEGORIES_LIST = [
  "Food Delivery",
  "Dining Out",
  "Groceries",
  "Transport",
  "Fuel",
  "Rent",
  "Utilities",
  "EMI/Loans",
  "Subscriptions",
  "Shopping",
  "Entertainment",
  "Health",
  "Travel",
  "Cash Withdrawal",
  "Income",
  "Transfers",
  "Other",
];

