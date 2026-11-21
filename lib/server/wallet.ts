import "server-only";

import { createPrivateKey, X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PKPass } from "passkit-generator";
import { cardKindLabels, makeCardPayload } from "../cards";
import { cardText } from "../card-text";
import { buildCardQr } from "../qr";
import { walletCardDesign } from "../wallet-card-design";

const passTypePattern = /^pass\.[a-z\d-]+(?:\.[a-z\d-]+)+$/i;
const teamPattern = /^[A-Z0-9]{10}$/;

export class WalletUnavailableError extends Error {
  constructor() {
    super("Apple Wallet signing is unavailable.");
    this.name = "WalletUnavailableError";
  }
}

function decodeSecret(value: string | undefined): Buffer {
  const input = value?.replace(/\s+/g, "") ?? "";
  const decoded = Buffer.from(input, "base64");

  if (!input || decoded.toString("base64") !== input) {
    throw new WalletUnavailableError();
  }

  return decoded;
}

export function readWalletConfiguration(env: Readonly<Record<string, string | undefined>> = process.env) {
  const passTypeIdentifier = env.APPLE_WALLET_PASS_TYPE_ID?.trim() ?? "";
  const teamIdentifier = env.APPLE_WALLET_TEAM_ID?.trim() ?? "";
  const organizationName = env.APPLE_WALLET_ORGANIZATION_NAME?.trim() ?? "";

  if (!passTypePattern.test(passTypeIdentifier) || !teamPattern.test(teamIdentifier) || !organizationName) {
    throw new WalletUnavailableError();
  }

  try {
    const signer = new X509Certificate(decodeSecret(env.APPLE_WALLET_SIGNER_CERT_BASE64));
    const intermediate = new X509Certificate(decodeSecret(env.APPLE_WALLET_WWDR_CERT_BASE64));
    const key = createPrivateKey({
      key: decodeSecret(env.APPLE_WALLET_SIGNER_KEY_BASE64),
      passphrase: env.APPLE_WALLET_SIGNER_KEY_PASSPHRASE,
    });
    const subject = signer.toLegacyObject().subject;
    const now = Date.now();
    const inDate = (cert: X509Certificate) => now >= Date.parse(cert.validFrom) && now <= Date.parse(cert.validTo);

    if (
      subject.UID !== passTypeIdentifier ||
      subject.OU !== teamIdentifier ||
      signer.ca ||
      !intermediate.ca ||
      !inDate(signer) ||
      !inDate(intermediate) ||
      key.asymmetricKeyType !== "rsa" ||
      !signer.checkPrivateKey(key) ||
      !signer.checkIssued(intermediate) ||
      !signer.verify(intermediate.publicKey)
    ) {
      throw new WalletUnavailableError();
    }

    return {
      passTypeIdentifier,
      teamIdentifier,
      organizationName,
      signer,
      intermediate,
      key,
    };
  } catch {
    throw new WalletUnavailableError();
  }
}

// Parsing and checking the certificates is the slow part of signing, so each server
// instance does it once and reuses the result for an hour (dates are re-checked then).
type WalletConfiguration = ReturnType<typeof readWalletConfiguration>;
let cachedConfiguration: { value: WalletConfiguration; at: number } | null = null;

export function walletConfiguration(): WalletConfiguration {
  if (!cachedConfiguration || Date.now() - cachedConfiguration.at > 3_600_000) {
    cachedConfiguration = { value: readWalletConfiguration(), at: Date.now() };
  }
  return cachedConfiguration.value;
}

const assetCache = new Map<string, Buffer>();
function asset(name: string): Buffer {
  let file = assetCache.get(name);
  if (!file) {
    file = readFileSync(join(process.cwd(), "lib/server/wallet-assets", name));
    assetCache.set(name, file);
  }
  return file;
}

let reportedUnavailable = false;

export function isWalletConfigured(): boolean {
  try {
    walletConfiguration();
    return true;
  } catch {
    // Show up in production logs and alerts, once per server instance.
    if (process.env.VERCEL_ENV === "production" && !reportedUnavailable) {
      reportedUnavailable = true;
      console.error("[heya] Apple Wallet signing is unavailable in production. Check the APPLE_WALLET_* settings and certificate dates.");
    }
    return false;
  }
}

// For the health check: whether passes can be signed, and when the signing certificate expires.
export function walletHealth(): { status: "ok" | "expiring" | "unavailable"; expiresAt?: string } {
  try {
    const { signer, intermediate } = walletConfiguration();
    const expires = Math.min(Date.parse(signer.validTo), Date.parse(intermediate.validTo));
    const expiresAt = new Date(expires).toISOString().slice(0, 10);
    return { status: expires - Date.now() < 30 * 86_400_000 ? "expiring" : "ok", expiresAt };
  } catch {
    return { status: "unavailable" };
  }
}

export function createWalletPass(
  savedCard: { id: string; draft: unknown },
  configuration = walletConfiguration(),
): Buffer {
  const { card, payload } = makeCardPayload(savedCard.draft);
  buildCardQr(payload);
  const kind = card.type === "universal" ? "universal" : card.kind;
  const label = kind === "universal" ? "Universal" : cardKindLabels[kind];
  const { base, action } = walletCardDesign(kind);
  const light = kind !== "snapchat";
  const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
  const { name, detail } = cardText(card);

  // A store card is the one pass style with a full-width artwork strip, so the pass can carry
  // the same gradient and engraved lines as the card on heya.cards. Wallet only allows an image
  // at the top left, so the card's own mark and name sit there and the Heya logo is in the strip.
  const pass = new PKPass(
    {
      "icon.png": asset("icon.png"),
      "icon@2x.png": asset("icon@2x.png"),
      "icon@3x.png": asset("icon@3x.png"),
      "logo.png": asset(`mark-${kind}.png`),
      "logo@2x.png": asset(`mark-${kind}@2x.png`),
      "logo@3x.png": asset(`mark-${kind}@3x.png`),
      "strip.png": asset(`strip-${kind}.png`),
      "strip@2x.png": asset(`strip-${kind}@2x.png`),
      "strip@3x.png": asset(`strip-${kind}@3x.png`),
    },
    {
      wwdr: configuration.intermediate.toString(),
      signerCert: configuration.signer.toString(),
      signerKey: configuration.key.export({ format: "pem", type: "pkcs1" }),
    },
    {
      formatVersion: 1,
      passTypeIdentifier: configuration.passTypeIdentifier,
      teamIdentifier: configuration.teamIdentifier,
      organizationName: configuration.organizationName,
      serialNumber: savedCard.id,
      description: `${label} card from Heya Cards`,
      logoText: label,
      backgroundColor: rgb(base),
      foregroundColor: light ? "rgb(255, 255, 255)" : "rgb(36, 29, 17)",
      labelColor: light ? "rgb(214, 201, 170)" : "rgb(92, 70, 20)",
    },
  );

  pass.type = "storeCard";
  // Top right, next to the card's name: where it came from, so people who see it can get one.
  // Shown in the small label line so it stays quiet; the value is left empty on purpose.
  pass.headerFields.push({ key: "site", label: "www.heya.cards", value: "" });
  pass.primaryFields.push({ key: "name", label: "", value: name });
  if (card.type === "universal") {
    if (card.jobTitle.trim()) pass.secondaryFields.push({ key: "role", label: "ROLE", value: card.jobTitle.trim() });
    if (card.company.trim()) pass.secondaryFields.push({ key: "company", label: "COMPANY", value: card.company.trim() });
  } else if (detail) {
    pass.secondaryFields.push({ key: "detail", label: label.toUpperCase(), value: detail });
  }
  pass.backFields.push({
    key: "heya",
    label: "Heya Cards",
    value: "Make your own free card at heya.cards",
  }, {
    key: "privacy",
    label: "QR privacy",
    value: "Anyone who scans or photographs this code can read and share the information it contains.",
  });
  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: payload,
    messageEncoding: "utf-8",
    altText: action,
  });

  return pass.getAsBuffer();
}
