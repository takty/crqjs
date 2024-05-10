/**
 * Library Utilities
 *
 * @author Takuto Yanagida
 * @version 2024-05-09
 */

import { FileSystem, Path } from '../lib/fsa.js';
import extractDeclarations from './custom-declaration.js';

const DEF_DIR_PS = 'def';

export async function checkLibraryReadable(code: string, fs: FileSystem, baseDir: Path) {
	const decs = extractDeclarations(code);

	for (let [lib,] of decs) {
		if (!lib.startsWith('http')) {
			if (!baseDir) {
				return lib;  // Error
			}
			const c = await fs.readFile(baseDir.concat(lib));
			if (null === c) {
				return lib;  // Error
			}
		}
	}
	return true;
}

export async function  loadDefFile(code: string, fs: FileSystem, baseDir: Path|null = null, defExt: string = '.json') {
	const decs = extractDeclarations(code);
	const ret: string[]  = [];

	for (let [lib,] of decs) {
		if (!lib.startsWith('http')) {
			if (!baseDir) {
				continue;
			}
			const libPath = baseDir.concat(lib);
			const c = await fs.readFile(libPath);
			if (null === c) {
				continue;  // Error
			}
			const def = await fs.readFile(makeDefPath(libPath, defExt)) as string;
			if (null === def) {
				continue;
			}
			ret.push(def);
		}
	}
	return ret;
}

function makeDefPath(path: Path, defExt: string) {
	const bn  = path.baseName(path.extName());
	return path.parent().concat(DEF_DIR_PS).concat(`${bn}${defExt}`);
}
