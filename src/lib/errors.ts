/** Turn backend errors into plain messages staff can act on. */
export function friendlyError(err: unknown): string {
  const raw =
    err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err ?? "");
  const code = err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "";

  if (/AP_SIGNUP_CLOSED|Database error saving new user|Signups not allowed/i.test(raw)) {
    return "This account isn't registered with Auto Phoenix. Ask your admin to create your account.";
  }
  if (code === "23505" || /duplicate key/i.test(raw)) {
    if (/customers_phone/.test(raw)) return "A customer with this phone number already exists (it may be registered at another branch).";
    if (/vehicles_plate/.test(raw)) return "A vehicle with this plate is already registered.";
    if (/vehicles_vin/.test(raw)) return "A vehicle with this VIN is already registered.";
    if (/branches_code/.test(raw)) return "Another branch already uses this code.";
    return "This record already exists.";
  }
  if (code === "42501" || /row-level security|permission denied/i.test(raw)) {
    return "You don't have permission to do this.";
  }
  if (/Invalid login credentials/i.test(raw)) return "Email or password is incorrect.";
  if (/Email not confirmed/i.test(raw)) return "Please confirm your email first — check your inbox.";
  if (/Invalid phone number/i.test(raw)) return "Please enter a valid phone number.";
  if (/check constraint/i.test(raw) && /trn/i.test(raw)) return "TRN must be exactly 15 digits.";
  return raw || "Something went wrong. Please try again.";
}
