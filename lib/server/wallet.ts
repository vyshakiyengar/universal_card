import "server-only";

import { createPrivateKey, X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PKPass } from "passkit-generator";
import { cardKindLabels, makeCardPayload } from "../cards";
import { photoPrefix } from "../card-photo";
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

export function isWalletConfigured(): boolean {
  try {
    readWalletConfiguration();
    return true;
  } catch {
    return false;
  }
}

export function createWalletPass(
  savedCard: { id: string; draft: unknown },
  configuration = readWalletConfiguration(),
): Buffer {
  const { card, payload } = makeCardPayload(savedCard.draft);
  buildCardQr(payload);
  const kind = card.type === "universal" ? "universal" : card.kind;
  const label = kind === "universal" ? "Universal card" : cardKindLabels[kind];
  const { background, foreground, action } = walletCardDesign(kind);
  const assets = join(process.cwd(), "lib/server/wallet-assets");

  const pass = new PKPass(
    {
      "icon.png": readFileSync(join(assets, "icon.png")),
      "icon@2x.png": readFileSync(join(assets, "icon@2x.png")),
      "icon@3x.png": readFileSync(join(assets, "icon@3x.png")),
      ...(card.type === "universal" && card.photo
        ? { "thumbnail.png": Buffer.from(card.photo.slice(photoPrefix.length), "base64") }
        : {
            "thumbnail.png": readFileSync(join(assets, "thumbnail.png")),
            "thumbnail@2x.png": readFileSync(join(assets, "thumbnail@2x.png")),
            "thumbnail@3x.png": readFileSync(join(assets, "thumbnail@3x.png")),
          }),
      "logo.png": readFileSync(join(assets, `mark-${kind}.png`)),
      "logo@2x.png": readFileSync(join(assets, `mark-${kind}@2x.png`)),
      "logo@3x.png": readFileSync(join(assets, `mark-${kind}@3x.png`)),
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
      description: "Heya Cards business card",
      logoText: label,
      backgroundColor: background,
      foregroundColor: foreground,
      labelColor: foreground,
    },
  );

  pass.type = "generic";
  pass.primaryFields.push({ key: "name", label: "Name", value: card.name || (kind === "universal" ? "Contact" : label) });
  pass.backFields.push({
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
