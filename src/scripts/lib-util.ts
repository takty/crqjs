/**
 * Library Utilities
 *
 * @author Takuto Yanagida
 * @version 2024-05-12
 */

import { FsaPath } from "$lib/fsa-path.js";
import extractDeclarations from './custom-declaration.js';

const DEF_DIR_PS = 'def';

export async function checkLibraryReadable(code: string, baseDir: FsaPath) {
	const decs = extractDeclarations(code);

	for (let [lib,] of decs) {
		if (!lib.startsWith('http')) {
			if (!baseDir) {
				return lib;  // Error
			}
			const c = await baseDir.join(lib).readFile();
			if (null === c) {
				return lib;  // Error
			}
		}
	}
	return true;
}

export async function  loadDefFile(code: string, baseDir: FsaPath|null = null, defExt: string = '.json') {
	const decs = extractDeclarations(code);
	const ret: string[]  = [];

	for (let [lib,] of decs) {
		if (!lib.startsWith('http')) {
			if (!baseDir) {
				continue;
			}
			const libPath = baseDir.join(lib);
			const c = await libPath.readFile();
			if (null === c) {
				continue;  // Error
			}
			const def = await makeDefPath(libPath, defExt).readFile() as string;
			if (null === def) {
				continue;
			}
			ret.push(def);
		}
	}
	return ret;
}

function makeDefPath(path: FsaPath, defExt: string) {
	return path.parent().join(DEF_DIR_PS, `${path.stem()}${defExt}`);
}
