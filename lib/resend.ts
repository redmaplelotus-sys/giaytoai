import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Resend client — singleton, lazy-initialized.
// Throws a clear error if called when RESEND_API_KEY is unset, rather than
// failing at module-load time.
// ---------------------------------------------------------------------------

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("Resend is not configured. Set RESEND_API_KEY.");
    }
    _resend = new Resend(key);
  }
  return _resend;
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@giaytoai.com";
