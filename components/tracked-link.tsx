"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { track } from "@/lib/track";

// A link that counts an anonymous click before navigating.
export function TrackedLink({ event, kind, onClick, ...props }: ComponentProps<typeof Link> & { event: string; kind?: string }) {
  return <Link {...props} onClick={(clickEvent) => { track(event, kind); onClick?.(clickEvent); }} />;
}
