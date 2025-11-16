import { Principal } from "@dfinity/principal";

/**
 * ============================================
 * ICP / e8s CONVERSION UTILITIES
 * ============================================
 * ICP uses 8 decimal places (like Bitcoin)
 * 1 ICP = 100,000,000 e8s
 */

/**
 * Convert user-friendly ICP string to e8s bigint
 * Examples:
 *   "0.01" -> 1000000n
 *   "1.5" -> 150000000n
 *   "10" -> 1000000000n
 */
export function icpToE8s(input: string): bigint {
  const clean = input.trim();
  if (clean === "" || clean === "0") return 0n;

  // Split into whole and fractional parts
  const parts = clean.split(".");
  const whole = parts[0] || "0";
  const frac = parts[1] || "";

  // Pad fractional part to 8 digits (e8s precision)
  const fracPadded = (frac + "00000000").slice(0, 8);

  // Combine and convert to bigint
  const combined = whole + fracPadded;
  const normalized = combined.replace(/^0+(\d)/, "$1") || "0";

  return BigInt(normalized);
}

/**
 * Convert e8s bigint to user-friendly ICP string
 * Examples:
 *   1000000n -> "0.01"
 *   150000000n -> "1.5"
 *   1000000000n -> "10"
 */
export function e8sToIcp(e8s: bigint): string {
  const s = e8s.toString().padStart(9, "0");
  const whole = s.slice(0, -8) || "0";
  const frac = s.slice(-8).replace(/0+$/, ""); // Remove trailing zeros

  return frac ? `${whole}.${frac}` : whole;
}

/**
 * Format e8s amount with optional decimal places
 * Examples:
 *   formatIcpAmount(1000000n) -> "0.01 ICP"
 *   formatIcpAmount(1000000n, { symbol: "wICP" }) -> "0.01 wICP"
 *   formatIcpAmount(1000000n, { decimals: 4 }) -> "0.0100 ICP"
 */
export function formatIcpAmount(
  e8s: bigint,
  options?: {
    symbol?: string;
    decimals?: number;
    showSymbol?: boolean;
  }
): string {
  const { symbol = "ICP", decimals, showSymbol = true } = options || {};

  let icp = e8sToIcp(e8s);

  // Format to specific decimal places if requested
  if (decimals !== undefined) {
    const num = parseFloat(icp);
    icp = num.toFixed(decimals);
  }

  return showSymbol ? `${icp} ${symbol}` : icp;
}

/**
 * Validate ICP amount string
 * Returns error message if invalid, null if valid
 */
export function validateIcpAmount(input: string): string | null {
  const clean = input.trim();

  if (clean === "") {
    return "Amount is required";
  }

  if (!/^\d+\.?\d*$/.test(clean)) {
    return "Invalid number format";
  }

  const parts = clean.split(".");
  if (parts[1] && parts[1].length > 8) {
    return "Maximum 8 decimal places";
  }

  try {
    const e8s = icpToE8s(clean);
    if (e8s <= 0n) {
      return "Amount must be greater than 0";
    }
    return null;
  } catch {
    return "Invalid amount";
  }
}

/**
 * ============================================
 * PRINCIPAL / HEX CONVERSION UTILITIES
 * ============================================
 */

/**
 * Convert Principal to hex string (for Sui burn operations)
 * Example: "aaaaa-aa" -> "00"
 */
export function principalToHex(principal: Principal | string): string {
  try {
    const p = typeof principal === "string" ? Principal.fromText(principal) : principal;
    const bytes = p.toUint8Array();
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (e) {
    throw new Error("Invalid principal format");
  }
}

/**
 * Convert hex string to Principal
 * Example: "00" -> "aaaaa-aa"
 */
export function hexToPrincipal(hex: string): Principal {
  const clean = hex.replace(/^0x/, "");
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  }

  return Principal.fromUint8Array(new Uint8Array(bytes));
}

/**
 * Validate Principal string
 * Returns error message if invalid, null if valid
 */
export function validatePrincipal(principal: string): string | null {
  if (!principal || principal.trim() === "") {
    return "Principal is required";
  }

  try {
    Principal.fromText(principal.trim());
    return null;
  } catch {
    return "Invalid principal format";
  }
}

/**
 * ============================================
 * ADDRESS FORMATTING UTILITIES
 * ============================================
 */

/**
 * Truncate long addresses for display
 * Examples:
 *   truncateAddress("0x1234567890abcdef", 6, 4) -> "0x1234...cdef"
 *   truncateAddress("aaaaa-aa-bbbbb-bb-ccccc-cc", 8, 6) -> "aaaaa-aa...ccc-cc"
 */
export function truncateAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address) return "";
  if (address.length <= startChars + endChars) return address;

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format Sui address with 0x prefix
 */
export function formatSuiAddress(address: string): string {
  if (!address) return "";
  return address.startsWith("0x") ? address : `0x${address}`;
}

/**
 * Validate Sui address format
 */
export function validateSuiAddress(address: string): string | null {
  if (!address || address.trim() === "") {
    return "Sui address is required";
  }

  const clean = address.trim();
  const withoutPrefix = clean.replace(/^0x/, "");

  if (!/^[0-9a-fA-F]{64}$/.test(withoutPrefix)) {
    return "Invalid Sui address (must be 64 hex characters)";
  }

  return null;
}

/**
 * ============================================
 * TIMESTAMP FORMATTING UTILITIES
 * ============================================
 */

/**
 * Convert nanosecond timestamp (from Motoko) to JS Date
 * Motoko Time.now() returns nanoseconds since epoch
 */
export function nanosToDate(nanos: bigint | number): Date {
  const ns = typeof nanos === "bigint" ? Number(nanos) : nanos;
  return new Date(ns / 1_000_000); // Convert to milliseconds
}

/**
 * Format timestamp for display
 * Examples:
 *   formatTimestamp(nanos) -> "Nov 10, 2025 3:45 PM"
 *   formatTimestamp(nanos, "relative") -> "2 hours ago"
 */
export function formatTimestamp(
  nanos: bigint | number,
  format: "full" | "short" | "relative" = "full"
): string {
  const date = nanosToDate(nanos);

  if (format === "relative") {
    return getRelativeTime(date);
  }

  if (format === "short") {
    return date.toLocaleDateString();
  }

  return date.toLocaleString();
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

/**
 * ============================================
 * EXPLORER LINK UTILITIES
 * ============================================
 */

/**
 * Get Sui explorer transaction link
 */
export function getSuiTxLink(
  digest: string,
  network: "mainnet" | "testnet" = "mainnet"
): string {
  return `https://suiscan.xyz/${network}/tx/${digest}`;
}

/**
 * Get Sui explorer object link
 */
export function getSuiObjectLink(
  objectId: string,
  network: "mainnet" | "testnet" = "mainnet"
): string {
  return `https://suiscan.xyz/${network}/object/${objectId}`;
}

/**
 * Get ICP dashboard link for principal
 */
export function getIcpDashboardLink(principal: string): string {
  return `https://dashboard.internetcomputer.org/account/${principal}`;
}

/**
 * Get ICP canister dashboard link
 */
export function getIcpCanisterLink(canisterId: string): string {
  return `https://dashboard.internetcomputer.org/canister/${canisterId}`;
}

/**
 * ============================================
 * CLIPBOARD UTILITIES
 * ============================================
 */

/**
 * Copy text to clipboard
 * Returns true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch {
      console.error("Failed to copy to clipboard", err);
      return false;
    }
  }
}

/**
 * ============================================
 * STATUS & UI UTILITIES
 * ============================================
 */

/**
 * Get status badge color based on state
 */
export function getStatusColor(status: "pending" | "completed" | "failed" | "released"): {
  bg: string;
  text: string;
  border: string;
} {
  const colors = {
    pending: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-200",
    },
    completed: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
    },
    failed: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
    },
    released: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
    },
  };

  return colors[status];
}

/**
 * Get deposit status from backend deposit object
 */
export function getDepositStatus(deposit: {
  released: boolean;
  suiBurnTx: [] | [string];
}): "pending" | "completed" | "released" {
  if (deposit.released) return "released";
  if (deposit.suiBurnTx && deposit.suiBurnTx.length > 0) return "completed";
  return "pending";
}

/**
 * ============================================
 * NUMBER FORMATTING UTILITIES
 * ============================================
 */

/**
 * Format number with thousands separators
 * Example: 1234567 -> "1,234,567"
 */
export function formatNumber(num: number | bigint): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Format large numbers with K/M/B suffixes
 * Examples:
 *   1500 -> "1.5K"
 *   1500000 -> "1.5M"
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1_000_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  return `${(num / 1_000_000_000).toFixed(1)}B`;
}

/**
 * ============================================
 * ERROR HANDLING UTILITIES
 * ============================================
 */

/**
 * Extract user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "An unknown error occurred";
}

/**
 * Check if error is a rejection/cancellation by user
 */
export function isUserRejection(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("user rejected") ||
    message.includes("user denied") ||
    message.includes("cancelled")
  );
}

/**
 * ============================================
 * CONSTANTS & CONFIGURATION
 * ============================================
 */

/**
 * Network configuration for easy switching
 */
export const NETWORK_CONFIG = {
  icp: {
    host: "https://icp0.io",
    identityProvider: "https://id.ai",
  },
  sui: {
    mainnet: {
      rpc: "https://fullnode.mainnet.sui.io:443",
      explorer: "https://suiscan.xyz/mainnet",
    },
    testnet: {
      rpc: "https://fullnode.testnet.sui.io:443",
      explorer: "https://suiscan.xyz/testnet",
    },
  },
} as const;

/**
 * Token configuration
 */
export const TOKEN_CONFIG = {
  symbol: "wICP",
  decimals: 8,
  minAmount: "0.00000001",
  maxAmount: "1000000",
} as const;

/**
 * UI Constants
 */
export const UI_CONFIG = {
  addressTruncateStart: 6,
  addressTruncateEnd: 4,
  refreshInterval: 30000, // 30 seconds
  toastDuration: 5000, // 5 seconds
} as const;