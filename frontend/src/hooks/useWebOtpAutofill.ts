import { useEffect } from 'react'

/**
 * Auto-fills the OTP input from an incoming SMS on Chrome for Android (and
 * inside the TWA wrapper, since that's the same browser engine) via the
 * WebOTP API — no "read SMS" permission, no native app needed. The SMS text
 * must end with `@<domain> #<code>` (see backend's `accounts/otp.py`
 * `_otp_message`), which is how the browser verifies the code was meant for
 * this exact site.
 *
 * Pure progressive enhancement: unsupported browsers (desktop, iOS Safari,
 * older Android) just don't get the auto-fill and the user types the code
 * normally — this hook is a no-op there.
 */
export function useWebOtpAutofill(active: boolean, onCode: (code: string) => void) {
  useEffect(() => {
    if (!active) return
    if (!('OTPCredential' in window)) return

    const controller = new AbortController()
    // The TS DOM lib doesn't know about the WebOTP API yet, hence the `any`.
    ;(navigator as any).credentials
      .get({ otp: { transport: ['sms'] }, signal: controller.signal })
      .then((cred: { code?: string } | null) => {
        if (cred?.code) onCode(cred.code)
      })
      .catch(() => {
        // AbortError on unmount/step-change, or just no SMS arrived before
        // the user gave up and typed it — either way, nothing to show.
      })

    return () => controller.abort()
  }, [active])
}
