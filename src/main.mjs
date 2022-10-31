/**
 * Main
 *
 * @author Takuto Yanagida
 * @version 2022-10-31
 */

import Fsa from './lib/fsa-node.mjs';
import Exporter from './exporter.mjs';

import { argv } from 'process';
const fsa = new Fsa();
load(argv[2]);

async function load(filePath) {
	const text = await fsa.readFile(filePath);
	if (!text) return;
	doExportAsWebPage(filePath, text);
}

async function doExportAsWebPage(filePath, text) {
	const expDir = _makeExportPath(filePath);
	try {
		await fsa.rmdir(expDir);
		await fsa.mkdir(expDir);

		const exporter = new Exporter(fsa);
		await exporter.exportAsWebPage(text, filePath, expDir, true);
	} catch (e) {
		console.error(e)
	}
}

function _makeExportPath(fp) {
	const name = fsa.baseName(fp, fsa.extName(fp));
	return fsa.join(fsa.dirName(fp), name + '.export');
}
