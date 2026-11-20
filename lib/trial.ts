// Cookies that let a first-time visitor try the studio before signing in.
export const trialCookies = {
  started: "heya_trial",
  visit: "heya_trial_visit",
  // A visit ends after two hours without opening the studio.
  visitSeconds: 2 * 60 * 60,
} as const;

export const trialStartHeader = "x-heya-trial-start";

// Browser storage keys shared by the studio's trial and account modes.
export const localCardsKey = "universal-card-studio-v1";
export const pendingWalletKey = "heya-pending-wallet";
