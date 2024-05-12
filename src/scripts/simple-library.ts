/**
 * Simplified Library
 *
 * @author Takuto Yanagida
 * @version 2024-05-12
 */

import { FsaPath } from "$lib/fsa-path.js";
import extractFunction from './function-extractor.js';
import extractDeclarations from './custom-declaration.js';

const EXP_EOL = '\r\n';

export async function exportAsLibrary(code: string, baseDir: FsaPath | null, destFile: FsaPath, nameSpace: string, codeStructure: { fns: string[]; }, doIncludeUseLib: boolean = false) {
	const fns = [...codeStructure.fns];
	let inc = '';

	if (doIncludeUseLib && baseDir) {
		const ul = await concatUseLib(code, baseDir, fns);
		if (Array.isArray(ul)) {
			return ul;
		}
		inc = ul;
	}
	const lc = createLibraryCode(code, fns, nameSpace, 0, inc);
	const res = await destFile.writeFile(lc);
	return [res, baseDir];
}

export async function readAsLibrary(srcFile: FsaPath, nameSpace: string, indent: number = 0) {
	const c = await srcFile.readFile() as string;
	if (null === c) {
		return null;
	}
	const { fns } = extractFunction(c);
	return createLibraryCode(c, fns, nameSpace, indent);
}

async function concatUseLib(code: string, baseDir: FsaPath, fns: string[]) {
	const decs = extractDeclarations(code).filter(e => null !== e[1]) as [string, string][];
	const lcs = [];

	for (let [lib, ns] of decs) {
		const lc = await readAsLibrary(baseDir.join(lib), ns, 1);
		if (!lc) {
			return [false, lib];
		}
		lcs.push(lc);
		fns.push(ns);
	}
	return lcs.join(EXP_EOL);
}

function createLibraryCode(code: string, fns: string[], nameSpace: string, indent: number = 0, inc: string = '') {
	const ls = code.split('\n').map(l => l.trimEnd());
	const tab = '\t'.repeat(indent);

	const ret = [`${tab}const ${nameSpace} = (() => {`];
	if (inc.length) {
		ret.push(inc);
	}
	ret.push(
		ls.map(l => `${tab}\t${l.replace(/\s+$/, '')}`).join(EXP_EOL),
		`${tab}\treturn { ${fns.join(', ')} };`,
		`${tab}})();`
	);
	return ret.join(EXP_EOL);
}
