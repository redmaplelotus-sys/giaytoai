import Stripe from "stripe";
import { serverEnv } from "@/lib/server-env";

// ---------------------------------------------------------------------------
// Stripe client — singleton, lazy-initialized
// ---------------------------------------------------------------------------

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!serverEnv.stripeSecretKey) {
      throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
    }
    _stripe = new Stripe(serverEnv.stripeSecretKey, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// ---------------------------------------------------------------------------
// Credit packs — maps Stripe Price IDs to credit amounts
// ---------------------------------------------------------------------------

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  /** Price in USD cents */
  priceUsd: number;
  /** Stripe Price ID */
  stripePriceId: string;
  /** true = recurring monthly subscription */
  recurring: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 5,
    priceUsd: 400,
    stripePriceId: serverEnv.stripePriceStarter ?? "",
    recurring: false,
  },
  {
    id: "standard",
    name: "Standard",
    credits: 15,
    priceUsd: 800,
    stripePriceId: serverEnv.stripePriceStandard ?? "",
    recurring: false,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 40,
    priceUsd: 1600,
    stripePriceId: serverEnv.stripePricePro ?? "",
    recurring: false,
  },
  {
    id: "unlimited",
    name: "Unlimited",
    credits: 0, // unlimited — handled by plan upgrade
    priceUsd: 1200,
    stripePriceId: serverEnv.stripePriceUnlimited ?? "",
    recurring: true,
  },
];

export function getPackByPriceId(priceId: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.stripePriceId === priceId);
}
