# `public/`

Static files served from the site root. A file here at `public/x.mp4` is
reachable at `/x.mp4`.

## `hero-video.mp4`

The hero's background video. `<Hero>` points at `/hero-video.mp4`, so the file
must carry exactly that name — it was renamed here from the generated name it
arrived with (`gemini_generated_video_8cfcfdb4.mp4`). Replacing the clip later
means overwriting this file, not pointing the code somewhere new.

If the file is ever missing the hero does NOT break: the section paints
`bg-zinc-950` beneath the video, so the dark ground and the white type over it
look the same — just still instead of moving.

Keep it small. This file blocks nothing, but it downloads on every first view
of the landing page, and it is decorative. Practical targets:

- 1920×1080, H.264/AAC-free (strip the audio track — the element is `muted`)
- under ~3 MB, which usually means 6–10 seconds on a loop
- `-movflags +faststart` so playback can begin before the file finishes

A one-liner that produces all of the above from any source clip:

```bash
ffmpeg -i source.mp4 -t 8 -an -vf "scale=1920:-2" -c:v libx264 -crf 28 -preset slow -movflags +faststart public/hero-video.mp4
```
