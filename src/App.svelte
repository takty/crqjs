<script lang="ts">
	import "./app.css";
	import { FileSystem, Path } from './scripts/fsa.js';
	import Exporter from './scripts/exporter.js';
	import extractFunction from './scripts/function-extractor.js';

	import Header from "./components/Header.svelte";
	import Editor from "./components/Editor.svelte";
	import DirectoryFilePicker from "./components/DirectoryFilePicker.svelte";

	// let dfp: DirectoryFilePicker;
	let fileChooser: HTMLDialogElement;

	let fs: FileSystem|null = null;
	let filePath: Path|null = null;
	let curPath: Path|null = null;
	let source: string;

	let _onClose: (hDir: FileSystemDirectoryHandle | null, hFile: FileSystemFileHandle | null, fn: string|null) => void;

	function openDialog(onClose: (hDir: FileSystemDirectoryHandle | null, hFile: FileSystemFileHandle | null, fn: string|null) => void) {
		_onClose = onClose;
		fileChooser.showModal();
	}

	async function closeDialog({
		detail: [hDir, hFile, fn],
	}: {
		detail: [FileSystemDirectoryHandle | null, FileSystemFileHandle | null, string|null];
	}) {
		fileChooser.close();
		_onClose(hDir, hFile, fn);
	}

	function open() {
		openDialog(async (hDir: FileSystemDirectoryHandle | null, hFile: FileSystemFileHandle | null, fn: string|null) => {
			if (hDir && hFile) {
				const f = await hFile.getFile();
				source = await f.text();

				fs = new FileSystem(hDir);
				const es = await hDir.resolve(hFile);
				filePath = new Path(es);
			}
		});
	}

	async function save() {
		if (fs !== null && filePath !== null) {
			fs.writeFile(filePath, source);
		}
	}

	async function saveAs() {
		openDialog(async (hDir: FileSystemDirectoryHandle | null, hFile: FileSystemFileHandle | null, fn: string|null) => {
			if (hDir && fn) {
				fs = new FileSystem(hDir);
				fs.writeFile(new Path(fn), source);
			}
		});
	}

	async function runCode() {
		console.log(fs);
		console.log(filePath);
		if (fs !== null && filePath !== null) {
			const ex  = new Exporter(fs);
			const fn  = filePath.baseName(filePath.extName());
			const [r, path] = await ex.exportAsWebPage(source, filePath, new Path(`${fn}.export`), true, 'url');
			if (r && path) {
				curPath = path;
			}
			if (curPath) {
				const fh = await fs.getFileHandle(curPath);
				if (null !== fh) {
					window.open(URL.createObjectURL(await fh.getFile()), 'field');
				}
			}
		} else {
			const hDir = await navigator.storage.getDirectory();
			const fsa = new FileSystem(hDir);

			const ex  = new Exporter(fsa);
			const fn  = 'temp';
			const [r, path] = await ex.exportAsWebPage(source, new Path(), new Path(`/${fn}.export`), true, 'url');
			if (r && path) {
				const fh = await fsa.getFileHandle(path);
				if (null !== fh) {
					window.open(URL.createObjectURL(await fh.getFile()), 'field');
				}
			}
		}
	}

	async function saveAsLibrary() {
		if (fs !== null && filePath !== null) {
			const ex  = new Exporter(fs);
			const fn  = filePath.baseName(filePath.extName());
			const [r, path] = await ex.exportAsLibrary(source, filePath.parent(), filePath.parent().concat(`${fn}.lib.js`), fn, extractFunction(source));
		}
	}

	function commandHandler(id: string) {
		switch (id) {
			case 'open': open(); break;
			case 'save': save(); break;
			case 'save-as': saveAs(); break;
			case 'run': runCode(); break;
			case 'save-as-library': saveAsLibrary(); break;
		}
	}
</script>

<main class="flex flex-col h-full">
	<Header handler={commandHandler}/>

	<Editor bind:value={source}/>

	<div class="status-bar"></div>

	<DirectoryFilePicker
		bind:dialog={fileChooser}
		message="Select a file and the folder contains the file."
		on:close={closeDialog}
	/>
</main>

<style>
	.status-bar {
		height: 1.5rem;
		background-color: #eee;
	}
</style>
