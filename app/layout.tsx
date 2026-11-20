import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { siteOrigin } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "Heya Cards",
  description: "Create free business cards for Apple Wallet and share your contact details with a scan.",
  icons: { icon: "/heya-mark.svg" },
  applicationName: "Heya Cards",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
