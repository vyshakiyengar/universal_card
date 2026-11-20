import { qrQuietZone as quietZone, type buildCardQr } from "@/lib/qr";

type QrCode = ReturnType<typeof buildCardQr>;

function modulePath({ size, modules }: QrCode) {
  const segments: string[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!modules[y * size + x]) continue;
      const start = x;
      while (x + 1 < size && modules[y * size + x + 1]) x++;
      const run = x - start + 1;
      segments.push(`M${start + quietZone} ${y + quietZone}h${run}v1h-${run}z`);
    }
  }
  return segments.join("");
}

export function QrGraphic({ code, label, maxWidth = 216 }: { code: QrCode; label: string; maxWidth?: number }) {
  const size = code.size + quietZone * 2;
  const pixels = size * Math.max(1, Math.floor(maxWidth / size));

  return (
    <svg role="img" aria-label={label} width={pixels} height={pixels} viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges" className="qr-code">
      <rect width={size} height={size} fill="white" />
      <path d={modulePath(code)} fill="black" />
    </svg>
  );
}
