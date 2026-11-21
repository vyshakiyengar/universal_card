"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

type Cut = { src: string };
type State = "idle" | "playing" | "paused" | "ended";

// By default it plays only when asked, so a visitor who scrolls down sees the clip from its first step.
// With autoStart it plays on a loop straight away, and if the phone blocks autoplay (Low Power Mode,
// data saver) it shows the play button instead of a frozen video. While idle the video is hidden and
// the figure's poster (a CSS background) shows behind the button.
export function HowItWorksPlayer({ phone, web, query, label, autoStart = false }:
  { phone: Cut; web: Cut; query: string; label: string; autoStart?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>(autoStart ? "playing" : "idle");

  useEffect(() => {
    if (!autoStart) return;
    const element = video.current;
    element?.play().catch(() => { if (element.paused) setState("idle"); });
  }, [autoStart]);

  function play() {
    const element = video.current;
    if (!element) return;
    if (state !== "paused") element.currentTime = 0;
    void element.play();
  }

  const action = state === "ended" ? "Watch again" : state === "paused" ? "Resume" : "Watch how it works";
  return (
    <>
      <video ref={video} muted playsInline loop={autoStart} preload={autoStart ? "auto" : "metadata"} aria-label={label} data-state={state}
        onPlay={() => setState("playing")}
        onPause={(event) => setState(event.currentTarget.ended ? "ended" : "paused")}
        onEnded={() => setState("ended")}
        onClick={(event) => { if (state === "playing") event.currentTarget.pause(); }}>
        <source media={query} src={phone.src} type="video/mp4" />
        <source src={web.src} type="video/mp4" />
      </video>
      {state !== "playing" && (
        <button type="button" className="how-clip-play" onClick={play}>
          <span className="how-clip-play-icon" aria-hidden="true">
            {state === "ended" ? <RotateCcw size={22} strokeWidth={2.2} /> : <Play size={24} strokeWidth={0} fill="currentColor" />}
          </span>
          <span>{action}</span>
        </button>
      )}
    </>
  );
}
