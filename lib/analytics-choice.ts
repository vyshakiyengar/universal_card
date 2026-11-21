export const metricsChoiceCookie = "heya_metrics";
export function allowsBrowserMetrics() {
  return document.cookie.split(";").some(entry => entry.trim() === metricsChoiceCookie + "=on");
}
