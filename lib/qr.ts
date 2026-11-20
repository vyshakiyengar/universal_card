import QRCode from "qrcode";
import { CardValidationError } from "./cards";

// Wallet renders its own matrix from the same contact payload.
export const qrLimits = {
  warningVersion: 10,
  maximumVersion: 15,
  warningBytes: 213,
  maximumBytes: 412,
} as const;

export const qrQuietZone = 4;

export function buildCardQr(payload: string) {
  const data = new TextEncoder().encode(payload);
  const bytes = data.length;
  if (!bytes) throw new CardValidationError("Add a destination or contact detail before making a QR code.");
  const isVCard = payload.startsWith("BEGIN:VCARD\r\n");
  if (bytes > (isVCard ? 1024 : qrLimits.maximumBytes)) {
    throw new CardValidationError("This QR is too dense. Remove a contact detail or shorten long links.");
  }
  let qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
  // A clean, unbranded digital QR can use less redundancy when that saves modules.
  if (isVCard && qr.version > qrLimits.warningVersion) {
    const compact = QRCode.create(payload, { errorCorrectionLevel: "L" });
    if (compact.version < qr.version) qr = compact;
  }
  if (qr.version > qrLimits.maximumVersion) throw new CardValidationError("This QR is too dense. Remove a contact detail or shorten long links.");
  const { size, data: modules } = qr.modules;
  return {
    size,
    modules,
    version: qr.version,
    bytes,
    density: qr.version > qrLimits.warningVersion ? "dense" as const : "normal" as const,
  };
}
