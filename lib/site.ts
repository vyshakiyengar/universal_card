// The public, canonical origin used for metadata, robots and the sitemap.
export const siteOrigin = "https://www.heya.cards";
export const siteHost = "heya.cards";

// The short "how it works" clip, a 16-second animation: a Universal card scan, then a WhatsApp card scan. Two cuts with
// the same story: a 4:5 one with large captions for phones and a 16:9 one for wider screens. Set to null to fall back
// to the illustrated steps on the landing page and no clip in the studio.
export const howItWorksClip: {
  phone: { src: string; poster: string };
  web: { src: string; poster: string };
} | null = {
  phone: { src: "/media/how-it-works-phone.mp4", poster: "/media/how-it-works-phone-poster.jpg" },
  web: { src: "/media/how-it-works-web.mp4", poster: "/media/how-it-works-web-poster.jpg" },
};
