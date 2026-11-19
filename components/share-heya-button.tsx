"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { tryNativeShare } from "@/lib/share";

const siteUrl = "https://www.heya.cards/";

export function ShareHeyaButton() {
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState<"copied" | "manual">();

  async function shareHeya() {
    setSharing(true);
    setStatus(undefined);

    try {
      if (await tryNativeShare({ title: "Heya Cards", url: siteUrl })) return;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(siteUrl);
        setStatus("copied");
      } else {
        setStatus("manual");
      }
    } catch {
      setStatus("manual");
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <button className="text-button share-heya" type="button" disabled={sharing} onClick={shareHeya}>
        <Share2 size={15} aria-hidden="true" /> Share Heya with friends
      </button>
      <p className="share-status" role="status">
        {status === "copied" && "Heya link copied."}
        {status === "manual" && <>Share this link <a href={siteUrl}>{siteUrl}</a></>}
      </p>
    </>
  );
}
