/**
 *
 * Main (JS)
 *
 * @author Takuto Yanagida
 * @version 2021-02-24
 *
 */


'use strict';

import FS from 'fs';
import PATH from 'path';
import PROC from 'process';

import Exporter from './exporter.mjs';

const argv = PROC.argv;
load(argv[2]);

async function load(filePath) {
	const text = await new Promise(resolve => {
		FS.readFile(filePath, 'utf-8', (error, contents) => { resolve(contents); });
	});
	doExportAsWebPage(filePath, text);
}

function doExportAsWebPage(filePath, text) {
	const expDir = _makeExportPath(filePath);
	try {
		_rmdirSync(expDir);
		FS.mkdirSync(expDir);

		const _exporter = new Exporter();
		_exporter.exportAsWebPage(text, filePath, expDir, true);
	} catch (e) {
	}
}

function _makeExportPath(fp) {
	const name = PATH.basename(fp, PATH.extname(fp));
	return PATH.join(PATH.dirname(fp), name + '.export');
}

function _rmdirSync(dirPath) {
	if (!FS.existsSync(dirPath)) return;
	for (let fp of FS.readdirSync(dirPath)) {
		fp = PATH.join(dirPath, fp);
		if (FS.lstatSync(fp).isDirectory()) {
			_rmdirSync(fp);
		} else {
			FS.unlinkSync(fp);
		}
	}
	FS.rmdirSync(dirPath);
}
