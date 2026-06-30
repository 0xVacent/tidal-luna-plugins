// Runs in the Electron main (Node) process. Render-side code imports these
// functions and Luna transparently bridges the calls over IPC.
import { mkdir, unlink, writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, isAbsolute, join } from "path";

const resolve = (outDir: string, name: string) => (isAbsolute(name) ? name : join(outDir, name));
const ensureDir = (p: string) => mkdir(dirname(p), { recursive: true }).catch(() => undefined);

/** Per-user default output folder (e.g. C:\Users\<you>\obs-now-playing). */
export const getDefaultDir = async (): Promise<string> => join(homedir(), "obs-now-playing");

/** Write a set of {fileName: textContent} entries to outDir as UTF-8 (no BOM). */
export const writeFiles = async (outDir: string, files: Record<string, string>): Promise<void> => {
	await Promise.all(
		Object.entries(files).map(async ([name, content]) => {
			const p = resolve(outDir, name);
			await ensureDir(p);
			await writeFile(p, content ?? "", "utf8");
		}),
	);
};

/** Delete files (used to clean up renamed/removed outputs). Missing files are ignored. */
export const deleteFiles = async (outDir: string, names: string[]): Promise<void> => {
	await Promise.all(
		names.map(async (name) => {
			try {
				await unlink(resolve(outDir, name));
			} catch {
				/* already gone — ignore */
			}
		}),
	);
};

/** Download an image URL and save it to outDir/name. */
export const writeCover = async (outDir: string, name: string, url: string): Promise<void> => {
	const res = await fetch(url);
	if (!res.ok) return;
	const buf = Buffer.from(await res.arrayBuffer());
	const p = resolve(outDir, name);
	await ensureDir(p);
	await writeFile(p, buf);
};
