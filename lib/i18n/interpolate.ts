/**
 * Replaces {key} placeholders in a template string with values from params.
 * Unknown keys are left as-is: "{unknown}" → "{unknown}".
 */
export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in params ? String(params[key]) : match,
  );
}
