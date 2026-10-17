"use client";

import { useEffect, useRef } from "react";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * The hero's background video.
 *
 * `autoPlay` alone is not enough and that is what produced the black screen on
 * refresh: a reload can restore the element in a paused state, and a browser
 * will also pause playback on its own — when the tab is backgrounded, when the
 * compositor stops, under power saving. Once paused, nothing in the markup
 * ever starts it again, and what is left on screen is the section's black
 * ground. So the attribute stays (it starts playback before this component
 * hydrates, which is earlier than any effect can) and this effect enforces it
 * from then on.
 *
 * `settle()` is deliberately the single handler for every signal — mount,
 * `canplay`, `loadeddata`, tab visibility, and the element pausing itself. It
 * is idempotent: it returns early when the video is already in the state it
 * wants, so re-entering it costs nothing and cannot loop.
 *
 * Reduced motion (constitution I) is the one case where it pauses instead. The
 * video is decorative, so a still frame loses nothing; the handler is attached
 * to the media query too, so toggling the OS setting takes effect live without
 * a reload.
 */
export function HeroVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const reduce = window.matchMedia(REDUCE_QUERY);

    function settle() {
      if (!video) return;
      if (reduce.matches) {
        if (!video.paused) video.pause();
        return;
      }
      // Playing while the tab is hidden burns battery and is immediately
      // undone by the browser; `visibilitychange` brings us back here.
      if (document.hidden || !video.paused) return;
      // Rejects when a policy blocks playback (an unmuted video, iOS Low Power
      // Mode). Nothing useful to do about it — the black ground is the design's
      // fallback — so the rejection is swallowed rather than thrown.
      void video.play().catch(() => {});
    }

    settle();
    video.addEventListener("loadeddata", settle);
    video.addEventListener("canplay", settle);
    video.addEventListener("pause", settle);
    document.addEventListener("visibilitychange", settle);
    reduce.addEventListener("change", settle);

    return () => {
      video.removeEventListener("loadeddata", settle);
      video.removeEventListener("canplay", settle);
      video.removeEventListener("pause", settle);
      document.removeEventListener("visibilitychange", settle);
      reduce.removeEventListener("change", settle);
    };
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      // Decorative: it carries nothing the copy does not, so it is hidden from
      // assistive tech and taken out of the tab order rather than described.
      aria-hidden
      tabIndex={-1}
      className={className}
    />
  );
}
