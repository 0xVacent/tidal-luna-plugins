# tidal-luna-plugins

[TidaLuna](https://github.com/Inrixia/TidaLuna) plugins by vacent.

## obs-now-playing

A now-playing plugin for **OBS**. It reads the currently-playing Tidal track —
**title, artists, live progress & duration, audio quality and cover art** — and
writes it to plain text/image files that OBS displays via **Text (GDI+) → Read
from file** and **Image** sources.

You define any number of output files in the plugin's settings, each with its own
format string (album art is saved separately). Files update live and the output
folder is created automatically.

### Install

In Tidal: **Luna Settings → Plugin Store → Install from URL**, and paste this
URL (it must end in `/store.json`):

```
https://github.com/0xVacent/tidal-luna-plugins/releases/download/latest/store.json
```

Then open the plugin's settings to choose your output folder and files. In OBS,
add a **Text (GDI+)** source per file (*Read from file*) and an **Image** source
for the cover.

### Format tokens

| Token | Value |
|---|---|
| `{title}` `{version}` | track title / version |
| `{artists}` `{artist}` | all artists / first artist |
| `{album}` `{album_artist}` | album title / first artist |
| `{progress}` `{duration}` | elapsed / total time (m:ss) |
| `{progress_sec}` `{duration_sec}` | elapsed / total (whole seconds) |
| `{percent}` | progress 0–100 |
| `{quality}` | e.g. `LOSSLESS`, `HIRES LOSSLESS` |
| `{track_number}` `{year}` | track number / release year |
| `{url}` `{explicit}` | track URL / `E` if explicit |

Write a token in **CAPS** (e.g. `{TITLE}`) to force the value UPPERCASE.

### Develop

```sh
pnpm install
pnpm build      # bundles to ./dist (the store)
pnpm serve      # serves a [DEV] store at http://127.0.0.1:3000
```

A push to `main` builds and publishes the `latest` release via GitHub Actions.
