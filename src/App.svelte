<script lang="ts">
	import "./app.css";
	import { FsaPath } from "$lib/fsa-path.js";
	import Exporter from './scripts/exporter.js';
	import extractFunction from './scripts/function-extractor.js';

	import Header from "./components/Header.svelte";
	import Editor from "./components/Editor.svelte";
	import DirectoryFilePicker from "./components/DirectoryFilePicker.svelte";

	let fileChooser: HTMLDialogElement;
	let filePath: FsaPath|null = null;
	let curPath: FsaPath|null = null;
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

				const es = await hDir.resolve(hFile) ?? [];
				filePath = new FsaPath(hDir, '/', ...es);
			}
		});
	}

	async function save() {
		if (filePath !== null) {
			filePath.writeFile(source);
		}
	}

	async function saveAs() {
		openDialog(async (hDir: FileSystemDirectoryHandle | null, hFile: FileSystemFileHandle | null, fn: string|null) => {
			if (hDir && fn) {
				filePath = new FsaPath(hDir, fn);
				filePath.writeFile(source);
			}
		});
	}

	async function runCode() {
		if (filePath !== null) {
			const ex  = new Exporter();
			const [r, path] = await ex.exportAsWebPage(source, filePath, filePath.withSuffix('.export'), true, 'url');
			if (r && path) {
				curPath = path;
			}
			if (curPath) {
				const fh = await curPath.getFileHandle();
				if (null !== fh) {
					window.open(URL.createObjectURL(await fh.getFile()), 'field');
				}
			}
		} else {
			const hDir = await navigator.storage.getDirectory();
			const ex  = new Exporter();
			const [r, path] = await ex.exportAsWebPage(source, null, new FsaPath(hDir, '/temp.export'), true, 'url');
			if (r && path) {
				const fh = await path.getFileHandle();
				if (null !== fh) {
					try {
						window.open(URL.createObjectURL(await fh.getFile()), 'field');
					} catch (e) {
						console.error(e);
					}
				}
			}
		}
	}

	async function saveAsLibrary() {
		if (filePath !== null) {
			const ex  = new Exporter();
			const [r, path] = await ex.exportAsLibrary(source, filePath.parent(), filePath.withSuffix('.lib.js'), filePath.stem(), extractFunction(source));
		}
	}

	async function commandHandler(id: string) {
		switch (id) {
			case 'open': open(); break;
			case 'save': save(); break;
			case 'save-as': saveAs(); break;
			case 'run': await runCode(); break;
			case 'export-library': saveAsLibrary(); break;
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
