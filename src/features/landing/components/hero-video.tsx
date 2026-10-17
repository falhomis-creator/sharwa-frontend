"use client";

import { useEffect, useRef } from "react";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/** How many times to re-fetch a broken source before leaving it alone. */
const MAX_RECOVERIES = 3;
/** Breathing room before a retry, so a dead server is not hammered. */
const RECOVER_DELAY_MS = 2000;

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
 * `recover()` handles the other way this goes black, which is the source
 * breaking rather than playback stopping: the file 404s, the dev server is
 * down, or the browser evicts the buffer and the re-fetch fails. A paused
 * video can be played again; a broken one has to be re-fetched, so this calls
 * `load()`. It is bound ONLY to `error` and `stalled` — never to `waiting`,
 * which fires on every single loop of a short clip and would mean reloading
 * the file every ten seconds. Retries are capped and delayed so a server that
 * is genuinely gone is not hammered, and the budget resets on `playing`.
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
    let recoveries = 0;
    let timer = 0;

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

    function recover() {
      if (!video || reduce.matches || recoveries >= MAX_RECOVERIES) return;
      recoveries += 1;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        // `load()` resets the element and re-requests the source, which is the
        // only way back from a decode or network error.
        video.load();
        settle();
      }, RECOVER_DELAY_MS);
    }

    function onPlaying() {
      recoveries = 0;
    }

    settle();
    video.addEventListener("loadeddata", settle);
    video.addEventListener("canplay", settle);
    video.addEventListener("pause", settle);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", recover);
    video.addEventListener("stalled", recover);
    document.addEventListener("visibilitychange", settle);
    reduce.addEventListener("change", settle);

    return () => {
      window.clearTimeout(timer);
      video.removeEventListener("loadeddata", settle);
      video.removeEventListener("canplay", settle);
      video.removeEventListener("pause", settle);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", recover);
      video.removeEventListener("stalled", recover);
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
