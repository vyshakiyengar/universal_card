import "server-only";

import { createPrivateKey, X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PKPass } from "passkit-generator";
import { makeCardPayload } from "../cards";
import { buildCardQr } from "../qr";

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

  const pass = new PKPass(
    {
      "icon.png": readFileSync(join(process.cwd(), "lib/server/wallet-assets/icon.png")),
      "icon@2x.png": readFileSync(join(process.cwd(), "lib/server/wallet-assets/icon@2x.png")),
      "icon@3x.png": readFileSync(join(process.cwd(), "lib/server/wallet-assets/icon@3x.png")),
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
      description: "Universal Card networking pass",
      logoText: configuration.organizationName,
      backgroundColor: "rgb(23, 24, 43)",
      foregroundColor: "rgb(255, 255, 255)",
      labelColor: "rgb(247, 186, 114)",
    },
  );

  pass.type = "generic";
  const destinationNames = {
    linkedin: "LinkedIn", instagram: "Instagram", whatsapp: "WhatsApp",
    email: "Email", phone: "Phone", url: "Website",
  };
  const label = card.type === "universal" ? "Contact" : destinationNames[card.kind];
  pass.primaryFields.push({ key: "name", label, value: card.name || label });
  if (card.type === "individual" && card.kind === "linkedin") {
    const profileId = payload.slice(payload.lastIndexOf("/") + 1);
    pass.secondaryFields.push({ key: "linkedin", label: "LINKEDIN ID", value: profileId });
  }
  pass.backFields.push({
    key: "privacy",
    label: "QR privacy",
    value: "Anyone who scans or photographs this code can read and share the information it contains.",
  });
  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: payload,
    messageEncoding: "utf-8",
    altText: card.type === "universal" ? "Scan to save contact" : "Scan to open destination",
  });

  return pass.getAsBuffer();
}
