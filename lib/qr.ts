import QRCode from "qrcode";
import { CardValidationError } from "./cards";

// QR Model 2, medium error correction and byte mode. Wallet renders its own matrix.
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
  if (bytes > qrLimits.maximumBytes) {
    throw new CardValidationError("This QR is too dense. Remove a contact detail or shorten long links.");
  }
  const qr = QRCode.create([{ data, mode: "byte" }], { errorCorrectionLevel: "M" });
  const { size, data: modules } = qr.modules;
  return {
    size,
    modules,
    version: qr.version,
    bytes,
    density: qr.version > qrLimits.warningVersion ? "dense" as const : "normal" as const,
  };
}
