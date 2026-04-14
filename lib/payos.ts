// eslint-disable-next-line @typescript-eslint/no-require-imports
const PayOS = require("@payos/node");
import { serverEnv } from "@/lib/server-env";

// ---------------------------------------------------------------------------
// PayOS client — singleton, lazy-initialized
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _payos: any = null;

export function getPayOS() {
  if (!_payos) {
    if (!serverEnv.payosClientId || !serverEnv.payosApiKey || !serverEnv.payosChecksumKey) {
      throw new Error("PayOS is not configured. Set PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY.");
    }
    _payos = new PayOS(
      serverEnv.payosClientId,
      serverEnv.payosApiKey,
      serverEnv.payosChecksumKey,
    );
  }
  return _payos;
}

// ---------------------------------------------------------------------------
// VND credit packs
// ---------------------------------------------------------------------------

export interface VndPack {
  id: string;
  name: string;
  credits: number;
  /** Price in VND */
  priceVnd: number;
  /** Display price */
  priceLabel: string;
  /** true = recurring monthly */
  recurring: boolean;
}

export const VND_PACKS: VndPack[] = [
  { id: "starter",   name: "Starter",   credits: 5,  priceVnd: 49000,  priceLabel: "49.000₫",  recurring: false },
  { id: "standard",  name: "Standard",  credits: 15, priceVnd: 99000,  priceLabel: "99.000₫",  recurring: false },
  { id: "pro",       name: "Pro",       credits: 40, priceVnd: 199000, priceLabel: "199.000₫", recurring: false },
  { id: "unlimited", name: "Unlimited", credits: 0,  priceVnd: 299000, priceLabel: "299.000₫", recurring: true  },
];

export function getVndPackById(id: string): VndPack | undefined {
  return VND_PACKS.find((p) => p.id === id);
}
