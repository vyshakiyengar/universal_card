import { qrQuietZone, type buildCardQr } from "./qr";
import { walletCardDesign } from "./wallet-card-design";
import type { DestinationKind } from "./cards";

async function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

function wrap(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    if (current && context.measureText(current + " " + word).width > width) {
      lines.push(current);
      current = "";
    }
    if (current) current += " ";
    for (const char of word) {
      if (current && context.measureText(current + char).width > width) {
        lines.push(current);
        current = "";
      }
      current += char;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function makeCardImage(options: {
  kind: DestinationKind | "universal"; label: string; name: string; detail: string;
  code: ReturnType<typeof buildCardQr>; photo?: string; mark: SVGSVGElement; filename: string;
}) {
  const { kind, label, name, detail, code, photo, mark, filename } = options;
  const design = walletCardDesign(kind);
  const svg = mark.cloneNode(true) as SVGSVGElement;
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("color", design.surfaceInk);
  svg.setAttribute("width", "60");
  svg.setAttribute("height", "60");
  const [platform, portrait] = await Promise.all([
    loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg))),
    photo ? loadImage(photo) : undefined,
    document.fonts.load('32px Baskervville'), document.fonts.load('16px "Instrument Sans Variable"'),
  ]);
  const scale = 3;
  const width = 420;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const nameSize = name.length > 28 ? 29 : 38;
  const nameFont = `500 ${nameSize}px Baskervville, Georgia, serif`;
  ctx.font = nameFont;
  const textWidth = portrait ? 249 : width - 46;
  const names = wrap(ctx, name, textWidth);
  ctx.font = '13px "Instrument Sans Variable", sans-serif';
  const details = wrap(ctx, detail, textWidth);
  const nameHeight = names.length * (nameSize + 2);
  const top = Math.max(196, 96 + nameHeight + details.length * 17);
  const height = top + 232;
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 20);
  ctx.clip();
  const wash = ctx.createLinearGradient(0, top, width, 0);
  wash.addColorStop(0, design.base);
  wash.addColorStop(.5, design.middle);
  wash.addColorStop(1, design.light);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, top);
  const sheen = ctx.createRadialGradient(width, 0, 0, width, 0, Math.max(width, top) * .74);
  sheen.addColorStop(0, design.glow);
  sheen.addColorStop(1, design.glow + "00");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, width, top);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, width, top); ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,.045)";
  for (let r = 60; r < 560; r += 29) {
    ctx.beginPath(); ctx.ellipse(525, top+170, r, r*.72, -.3, 0, 2*Math.PI); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = design.surfaceInk;
  ctx.drawImage(platform, 23, 21, 20, 20);
  ctx.font = '650 16px "Instrument Sans Variable", sans-serif';
  ctx.fillText(label, 51, 37);
  ctx.font = '600 12px "Instrument Sans Variable", sans-serif';
  ctx.textAlign = "right";
  ctx.fillText("heya.cards", 397, 35);
  ctx.textAlign = "left";
  ctx.font = nameFont;
  let y = 87 + nameSize*.7;
  for (const line of names) { ctx.fillText(line, 23, y); y += nameSize+2; }
  ctx.font = '13px "Instrument Sans Variable", sans-serif';
  y -= nameSize-16;
  for (const line of details) { ctx.fillText(line, 24, y); y += 17; }
  if (portrait) {
    const artY = (top - 94) / 2 + 17;
    ctx.save();
    ctx.beginPath();
    ctx.arc(343, artY + 47, 47, 0, 2 * Math.PI);
    ctx.clip();
    ctx.drawImage(portrait, 296, artY, 94, 94);
    ctx.restore();
  }
  ctx.fillStyle = "#f7f4ec";
  ctx.fillRect(0, top, width, height-top);
  ctx.fillStyle = "white";
  ctx.beginPath(); ctx.roundRect(22, top+18, 196, 196, 7); ctx.fill();
  // Paint on whole output pixels, including the four-module quiet zone.
  const total = code.size + 2*qrQuietZone;
  const modulePixels = Math.floor(196*scale/total);
  const origin = Math.floor((196*scale - total*modulePixels)/2) + qrQuietZone*modulePixels;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle = "black";
  code.modules.forEach((on,i) => {
    if (on) ctx.fillRect(22*scale+origin+(i%code.size)*modulePixels,(top+18)*scale+origin+Math.floor(i/code.size)*modulePixels,modulePixels,modulePixels);
  });
  ctx.restore();
  ctx.fillStyle = "#998e75"; ctx.fillRect(239,top+30,25,1);
  ctx.fillStyle = "#263029"; ctx.font = "24px Baskervville, Georgia, serif";
  wrap(ctx, design.action, 150).forEach((line,i) => ctx.fillText(line,239,top+64+27*i));
  ctx.font = "bold 17px Helvetica, sans-serif"; ctx.textAlign = "right"; ctx.fillText("heya",396,height-23);
  const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(image => image ? resolve(image) : reject(new Error("PNG unavailable")), "image/png"));
  return new File([blob], filename + ".png", { type: "image/png" });
}
