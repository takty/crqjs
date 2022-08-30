/**
 * Main
 *
 * @author Takuto Yanagida
 * @version 2022-08-30
 */

import * as nfs from './lib/nfs-node.mjs';
import Exporter from './exporter.mjs';

import { argv } from 'process';
load(argv[2]);

async function load(filePath) {
	const text = await nfs.readFile(filePath);
	if (!text) return;
	doExportAsWebPage(filePath, text);
}

async function doExportAsWebPage(filePath, text) {
	const expDir = _makeExportPath(filePath);
	try {
		await nfs.rmdirRecursive(expDir);
		await nfs.mkdir(expDir);

		const exporter = new Exporter();
		await exporter.exportAsWebPage(text, filePath, expDir, true);
	} catch (e) {
	}
}

function _makeExportPath(fp) {
	const name = nfs.basename(fp, nfs.extname(fp));
	return nfs.join(nfs.dirname(fp), name + '.export');
}
