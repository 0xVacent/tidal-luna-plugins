import { LunaUnload, ReactiveStore, Tracer } from "@luna/core";
import { MediaItem, PlayState } from "@luna/lib";

import { deleteFiles, getDefaultDir, writeCover, writeFiles } from "./writer.native";

export const { trace, errSignal } = Tracer("[OBS Now Playing]");
export const unloads = new Set<LunaUnload>();

export type Output = { file: string; format: string };

// Default output folder resolves to the current user's home (e.g.
// C:\Users\<you>\obs-now-playing) — computed on their machine, not hardcoded.
const defaultOutDir = await getDefaultDir();

// Persisted, user-editable settings (see Settings.tsx).
export const storage = await ReactiveStore.getPluginStorage("OBSNowPlaying", {
	outDir: defaultOutDir,
	// Arbitrary list of files, each with its own format string. Add/remove in the
	// settings panel — e.g. album.txt -> "{album}", artist.txt -> "{artists}".
	outputs: [
		{ file: "song.txt", format: "{title} - {artists}" },
		{ file: "songtime.txt", format: "{progress} : {duration}" },
	] as Output[],
	writeCoverImage: true,
	coverFile: "cover.png",
	coverRes: 640,
	placeholder: "",
	refreshMs: 1000,
});

// ---- formatting -----------------------------------------------------
const pad = (n: number) => String(n).padStart(2, "0");
const fmtTime = (sec: number) => {
	sec = Math.max(0, Math.floor(sec || 0));
	return `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
};

const tokenRe = /\{([A-Za-z_]+)\}/g;
// Replace {token}; an ALL-CAPS token forces the value to uppercase.
const expand = (tpl: string, vals: Record<string, string>) =>
	tpl.replace(tokenRe, (m, raw: string) => {
		const v = vals[raw.toLowerCase()];
		if (v === undefined) return m;
		return raw === raw.toUpperCase() && raw !== raw.toLowerCase() ? v.toUpperCase() : v;
	});

const coverUrlFor = (uuid: string, res: number) =>
	`https://resources.tidal.com/images/${uuid.split("-").join("/")}/${res}x${res}.jpg`;

const buildVals = (item: MediaItem, pos: number): Record<string, string> => {
	const t = item.tidalItem as any;
	const artists = (t.artists ?? []).map((a: any) => a?.name).filter(Boolean).join(", ");
	const dur = item.duration ?? t.duration ?? 0;
	const pct = dur ? Math.round((pos / dur) * 100) : 0;
	return {
		title: t.title ?? "",
		version: t.version ?? "",
		artists,
		artist: t.artists?.[0]?.name ?? "",
		album: t.album?.title ?? "",
		album_artist: t.artists?.[0]?.name ?? "",
		progress: fmtTime(pos),
		duration: fmtTime(dur),
		progress_sec: String(Math.floor(pos)),
		duration_sec: String(Math.floor(dur)),
		percent: String(pct),
		quality: String(t.audioQuality ?? "").replace("_", " "),
		track_number: String(t.trackNumber ?? ""),
		year: String(t.releaseDate ?? t.streamStartDate ?? "").slice(0, 4),
		url: t.url ?? "",
		explicit: t.explicit ? "E" : "",
	};
};

// ---- the poll/write cycle -------------------------------------------
let lastCoverId: string | number | undefined;
// Files this plugin wrote last cycle, so we can clean up the ones that vanish
// (renamed or removed). We only ever delete files we created ourselves.
let lastFiles = new Set<string>();

const flush = async (map: Record<string, string>) => {
	if (Object.keys(map).length) await writeFiles(storage.outDir, map);
	const current = new Set(Object.keys(map));
	const stale = [...lastFiles].filter((f) => !current.has(f));
	if (stale.length) await deleteFiles(storage.outDir, stale);
	lastFiles = current;
};

const update = async () => {
	try {
		const outs = [...((storage.outputs ?? []) as Output[])];
		const item = await MediaItem.fromPlaybackContext();
		const map: Record<string, string> = {};

		if (item === undefined) {
			for (const o of outs) if (o?.file) map[o.file] = storage.placeholder;
			lastCoverId = undefined;
		} else {
			const pos = PlayState.currentTime; // live player position, seconds
			const vals = buildVals(item, pos);
			for (const o of outs) if (o?.file) map[o.file] = expand(o.format ?? "", vals);
		}

		await flush(map);

		if (item !== undefined && storage.writeCoverImage) {
			const cover = (item.tidalItem as any).album?.cover;
			if (item.id !== lastCoverId && cover) {
				await writeCover(storage.outDir, storage.coverFile, coverUrlFor(cover, storage.coverRes));
				lastCoverId = item.id;
			}
		}
	} catch (err) {
		trace.err.withContext("update")(err);
	}
};

// Refresh on a timer (progress) and immediately whenever the track changes.
const interval = setInterval(update, storage.refreshMs);
unloads.add(() => clearInterval(interval));
MediaItem.onMediaTransition(unloads, () => {
	lastCoverId = undefined;
	void update();
});
void update();

export { Settings } from "./Settings";
