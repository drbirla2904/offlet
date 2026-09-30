/**
 * DRF returns validation errors per-field, e.g.
 * {"email": ["user with this email already exists."], "password": [...]}
 * — not as a single `.detail` string (that shape is only used for
 * permission/auth errors and our custom `login_required` payloads).
 * This pulls out something readable regardless of which shape came back.
 */
export function apiErrorMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
  const data = err?.response?.data
  if (!data) return err?.message === 'Network Error' ? "Can't reach the server — please check your connection." : fallback

  if (typeof data === 'string') return data
  if (data.detail) return typeof data.detail === 'string' ? data.detail : data.detail.message || fallback
  if (data.message) return data.message

  // Field-error dict: {"email": ["..."], "password": ["..."]}
  const parts: string[] = []
  for (const [field, messages] of Object.entries(data)) {
    const list = Array.isArray(messages) ? messages : [messages]
    const label = field === 'non_field_errors' ? '' : `${field}: `
    parts.push(`${label}${list.join(' ')}`)
  }
  return parts.length ? parts.join(' ') : fallback
}
