export const photoPrefix = "data:image/png;base64,";
export const maxPhotoLength = 9400;

export function validCardPhoto(value: unknown): value is string {
  if (typeof value !== "string" || value.length > maxPhotoLength || !value.startsWith(photoPrefix)) return false;
  const data = value.slice(photoPrefix.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data) || data.length % 4) return false;
  const raw = atob(data);
  if (!raw.startsWith("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR") || !raw.endsWith("IEND\xaeB\x60\x82")) return false;
  const dimensions = new DataView(Uint8Array.from(raw.slice(16, 24), c => c.charCodeAt(0)).buffer);
  const width = dimensions.getUint32(0);
  return width >= 32 && width <= 144 && dimensions.getUint32(4) === width;
}

export async function prepareCardPhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 12 * 1024 * 1024) {
    throw new Error("Choose a JPG, PNG or WebP photo under 12 MB.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    for (const size of [144, 112, 90, 72, 56, 44, 32]) {
      canvas.width = canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) break;
      context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      const photo = canvas.toDataURL("image/png");
      if (validCardPhoto(photo)) return photo;
    }
    throw new Error("This photo could not be resized.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
