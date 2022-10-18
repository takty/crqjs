import Fsa from './lib/fsa.mjs';
// import * as nfs from './lib/nfs-node.mjs';
import Exporter from './exporter.mjs';

window.addEventListener('DOMContentLoaded', async () => {
	let fs = null;
	let curPath = null;

	const btn = document.getElementById('open');
	btn.addEventListener('click', async () => {
		const res = await showTargetPicker('Select a file and the folder contains the file.')
		if (res) {
			const [fh, dh] = res;
			const file     = await fh.getFile();
			const codeText = await file.text();

			fs = new Fsa(dh);
			const ex = new Exporter(fs);
			const [r, path] = await ex.exportAsPackedWebPage(codeText, fh.name, `/${fh.name}.export`, true);
			if (r) {
				curPath = path;
				// const fh = await fs.getFileHandle(path);
				// window.open(URL.createObjectURL(await fh.getFile()));
			}
		}
	});
	const btnRun = document.getElementById('run');
	btnRun.addEventListener('click', async () => {
		if (fs && curPath) {
			const fh = await fs.getFileHandle(curPath);
			window.open(URL.createObjectURL(await fh.getFile()), 'field');
		}
	});
});

function createPicker(onClose, message) {
	let fh = null;
	let dh = null;

	const frame = document.createElement('div');
	const msg  = document.createElement('p');
	msg.innerText = message;
	const row1 = document.createElement('div');
	const row2 = document.createElement('div');
	const row3 = document.createElement('div');
	frame.appendChild(msg);
	frame.appendChild(row1);
	frame.appendChild(row2);
	frame.appendChild(row3);

	const selDir = document.createElement('button');
	selDir.innerText = 'Select Folder...';
	row1.appendChild(selDir);

	const selFile = document.createElement('select');
	selFile.disabled = true;
	const defOp = document.createElement('option');
	defOp.innerText = 'Select File...';
	selFile.appendChild(defOp);
	row2.appendChild(selFile);

	const open = document.createElement('button');
	open.innerText = 'Open';
	open.disabled = true;
	const cancel = document.createElement('button');
	cancel.innerText = 'Cancel';
	row3.appendChild(open);
	row3.appendChild(cancel);

	document.body.appendChild(frame);

	const fileHandles = [];

	selDir.addEventListener('click', async () => {
		while (true) {
			dh = await window.showDirectoryPicker();
			if (!dh) break;

			selFile.innerHTML = '';
			fileHandles.length = 0;

			for await (const e of dh.values()) {
				if ('file' === e.kind /*&& e.name.endsWith('.js')*/) {
					const op = document.createElement('option');
					op.innerText = e.name;
					op.value = fileHandles.length;
					selFile.appendChild(op);
					fileHandles.push(e);
				}
			}
			selFile.disabled = null;
			open.disabled = null;
			break;
		}
	});
	open.addEventListener('click', () => {
		document.body.removeChild(frame);
		const idx = parseInt(selFile.value);
		onClose([fileHandles[idx], dh]);
	});
	cancel.addEventListener('click', () => {
		document.body.removeChild(frame);
		onClose(null);
	});
}

function showTargetPicker(message) {
	return new Promise(resolve => {
		createPicker(resolve, message);
	});
}
