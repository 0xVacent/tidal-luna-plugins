import React from "react";

import { LunaButton, LunaSettings, LunaSwitchSetting, LunaTextSetting } from "@luna/ui";

import { storage, type Output } from ".";

export const Settings = () => {
	// --- general ---
	const [outDir, setOutDir] = React.useState(storage.outDir);
	const [placeholder, setPlaceholder] = React.useState(storage.placeholder);
	const [refreshMs, setRefreshMs] = React.useState(String(storage.refreshMs));

	// --- dynamic output files ---
	const [outputs, setOutputs] = React.useState<Output[]>(() =>
		((storage.outputs ?? []) as Output[]).map((o) => ({ file: o.file, format: o.format })),
	);
	// Write the given list to storage (this is what the background writer reads).
	const persist = (list: Output[]) => {
		storage.outputs = list.map((o) => ({ file: o.file, format: o.format }));
	};
	const mapSet = (i: number, key: keyof Output, value: string) =>
		outputs.map((o, idx) => (idx === i ? { ...o, [key]: value } : o));

	// File name: update the input as you type, but only commit to the writer on
	// blur — so half-typed names never get created as files. New rows start
	// empty (the writer skips empty names), so adding one creates nothing.
	const onNameInput = (i: number, value: string) => setOutputs(mapSet(i, "file", value));
	const commitName = () => persist(outputs);
	// Format only changes a file's contents, so committing live is fine.
	const onFormatInput = (i: number, value: string) => {
		const next = mapSet(i, "format", value);
		setOutputs(next);
		persist(next);
	};
	const addRow = () => {
		const next = [...outputs, { file: "", format: "{title}" }];
		setOutputs(next);
		persist(next);
	};
	const removeRow = (i: number) => {
		const next = outputs.filter((_, idx) => idx !== i);
		setOutputs(next);
		persist(next);
	};

	// --- cover ---
	const [writeCoverImage, setWriteCoverImage] = React.useState(storage.writeCoverImage);
	const [coverFile, setCoverFile] = React.useState(storage.coverFile);
	const [coverRes, setCoverRes] = React.useState(String(storage.coverRes));

	return (
		<>
			<LunaSettings title="General">
				<LunaTextSetting
					title="Output folder"
					desc="Folder where every file below is written"
					value={outDir}
					onChange={(e: any) => setOutDir((storage.outDir = e.target.value))}
				/>
				<LunaTextSetting
					title="Placeholder"
					desc="Written to every file when nothing is playing"
					value={placeholder}
					onChange={(e: any) => setPlaceholder((storage.placeholder = e.target.value))}
				/>
				<LunaTextSetting
					title="Refresh (ms)"
					desc="How often files update. Reload the plugin after changing."
					value={refreshMs}
					onChange={(e: any) => {
						setRefreshMs(e.target.value);
						const n = parseInt(e.target.value, 10);
						if (!Number.isNaN(n) && n >= 100) storage.refreshMs = n;
					}}
				/>
			</LunaSettings>

			<LunaSettings
				title="Output files"
				desc="Define as many files as you want — each gets its own format. Tokens: {title} {version} {artists} {artist} {album} {album_artist} {progress} {duration} {progress_sec} {duration_sec} {percent} {quality} {track_number} {year} {url} {explicit}. Use CAPS for UPPERCASE."
			>
				{outputs.map((o, i) => (
					<React.Fragment key={i}>
						<LunaTextSetting
							title={`File ${i + 1} — name`}
							placeholder="e.g. album.txt"
							value={o.file}
							onChange={(e: any) => onNameInput(i, e.target.value)}
							onBlur={() => commitName()}
						/>
						<LunaTextSetting
							title={`File ${i + 1} — format`}
							value={o.format}
							onChange={(e: any) => onFormatInput(i, e.target.value)}
						/>
						<LunaButton color="error" variant="outlined" onClick={() => removeRow(i)}>
							Remove file {i + 1}
						</LunaButton>
					</React.Fragment>
				))}
				<LunaButton onClick={addRow}>+ Add file</LunaButton>
			</LunaSettings>

			<LunaSettings title="Cover image">
				<LunaSwitchSetting
					title="Write cover image"
					desc="Download the album art to the cover file"
					checked={writeCoverImage}
					onChange={(_: any, checked: boolean) => setWriteCoverImage((storage.writeCoverImage = checked))}
				/>
				<LunaTextSetting
					title="Cover file name"
					value={coverFile}
					onChange={(e: any) => setCoverFile((storage.coverFile = e.target.value))}
				/>
				<LunaTextSetting
					title="Cover resolution"
					desc="80, 160, 320, 640, or 1280"
					value={coverRes}
					onChange={(e: any) => {
						setCoverRes(e.target.value);
						const n = parseInt(e.target.value, 10);
						if (!Number.isNaN(n)) storage.coverRes = n;
					}}
				/>
			</LunaSettings>
		</>
	);
};
