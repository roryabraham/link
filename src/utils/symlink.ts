import fs from 'fs/promises';
import { fsExists } from './fs-exists';
import { waitFor } from './wait-for';

/**
 * Helper to create a symlink
 * Deletes the target path if it exists
 */
export const symlink = async (
	targetPath: string,
	symlinkPath: string,
	type?: string,
) => {
	const stats = await fs.lstat(symlinkPath).catch(() => null);
	if (stats) {
		if (stats.isSymbolicLink()) {
			const symlinkRealpath = await fs.realpath(symlinkPath).catch(() => null);

			if (targetPath === symlinkRealpath) {
				return;
			}
		}

		await fs.rm(symlinkPath, {
			recursive: true,
		});
	}

	await fs.symlink(
		targetPath,
		symlinkPath,
		type,
	);
};

export const symlinkBinary = async (
	binaryPath: string,
	linkPath: string,
) => {
	await symlink(binaryPath, linkPath);
	await fs.chmod(linkPath, 0o755);
};

export const hardlink = async (
	sourcePath: string,
	hardlinkPath: string,
) => {
	if (await fsExists(hardlinkPath)) {
		try {
			const [
				existingStat,
				sourceStat,
			] = await Promise.all([
				fs.stat(hardlinkPath),
				fs.stat(sourcePath),
			]);
			if (existingStat.ino === sourceStat.ino) {
				return;
			}

			await fs.rm(hardlinkPath, {
				recursive: true,
			});
		} catch {}
	}

	try {
		await waitFor(
			async () => await fsExists(sourcePath),
			500,
			15000,
			`Trying to link source file that does not exist ${sourcePath}`,
		)
		await fs.link(sourcePath, hardlinkPath);
	} catch {}
};
