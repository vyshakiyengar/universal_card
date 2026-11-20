// The public, canonical origin used for metadata, robots and the sitemap.
export const siteOrigin = "https://www.heya.cards";
export const siteHost = "heya.cards";

// The short "how it works" clip, a 16-second animation: a Universal card scan, then a WhatsApp card scan. Set to null to
// fall back to the illustrated steps on the landing page and no clip in the studio.
export const howItWorksClip: { src: string; poster: string; fastSrc: string } | null = {
  src: "/media/how-it-works.mp4",
  poster: "/media/how-it-works-poster.jpg",
  // The same clip at 2x speed and phone size, for the studio's first screen on phones.
  fastSrc: "/media/how-it-works-fast.mp4",
};
