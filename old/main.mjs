/**
 * Main
 *
 * @author Takuto Yanagida
 * @version 2022-11-01
 */

import Fsa from './lib/fsa-node.mjs';
import Exporter from './exporter.mjs';

import { argv } from 'process';
const fs = new Fsa();
load(argv[2]);

async function load(filePath) {
	const text = await fs.readFile(filePath);
	if (!text) return;
	doExportAsWebPage(filePath, text);
}

async function doExportAsWebPage(filePath, text) {
	const expDir = _makeExportPath(filePath);
	try {
		await fs.rmdir(expDir);
		await fs.mkdir(expDir);

		const exporter = new Exporter(fs);
		await exporter.exportAsWebPage(text, filePath, expDir, true);
	} catch (e) {
		console.error(e)
	}
}

function _makeExportPath(fp) {
	const name = fs.baseName(fp, fs.extName(fp));
	return fs.join(fs.dirName(fp), name + '.export');
}
