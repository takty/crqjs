<script lang="ts">
	import { createEventDispatcher } from "svelte";
	const dispatch = createEventDispatcher();

	export let dialog: HTMLDialogElement;
	export let message: string;

	let hDir: FileSystemDirectoryHandle | null = null;
	let hFns: { hFile: FileSystemFileHandle; name: string }[] = [];
	let curIdx = 0;

	async function selectFolder() {
		// @ts-ignore
		hDir = await window.showDirectoryPicker();
		if (!hDir) return;

		const fns: { hFile: FileSystemFileHandle; name: string }[] = [];
		for await (const e of hDir.values()) {
			if ("file" === e.kind && e.name.endsWith(".js")) {
				fns.push({ hFile: e as FileSystemFileHandle, name: e.name });
			}
		}
		hFns = fns;
	}

	function open() {
		dispatch("close", [hDir, hFns[curIdx].hFile]);
	}

	function cancel() {
		dispatch("close", [null, null]);
	}
</script>

<dialog bind:this={dialog}>
	<div class="inner">
		<div class="message">{message}</div>

		<div class="step">
			<div>1. Select a project folder</div>
			<button on:click={selectFolder}>Select Folder...</button>

			<div class="selected">
				Current Folder:
				<div>
					{#if hDir}{hDir.name}{/if}
				</div>
			</div>

			<div>2. Select a file from the folder</div>
			{#if hFns.length === 0}
				<select disabled>
					<option>No files</option>
				</select>
			{:else}
				<select bind:value={curIdx}>
					{#each hFns as hFn, i}
						<option value={i}>{hFn.name}</option>
					{/each}
				</select>
			{/if}
		</div>

		<div class="action">
			<button on:click={open} disabled={hFns.length === 0}>Open</button>
			<button on:click={cancel}>Cancel</button>
		</div>
	</div>
</dialog>

<style>
	dialog {
		border: 1px solid #777;
	}
	button,
	select {
		padding: 0.5rem 1rem;
	}
	.inner {
		display: grid;
		gap: 1.5rem;
	}
	.message {
		font-weight: bold;
	}
	.step {
		display: grid;
		gap: 1rem;
		grid-template-columns: auto auto;
		justify-items: start;

		& :is(button, select) {
			width: 100%;
		}
	}
	.selected {
		grid-area: 2/1/3/3;

		display: flex;
		gap: 1rem;
		width: 100%;

		margin-block-end: 1rem;
		padding-inline-start: 1rem;

		& div {
			flex-grow: 1;
			border-block-end: 1px dashed #777;
			line-height: 1.25;
			padding-block: 0.25rem;

			width: 16rem;
			min-height: 2rem;
		}
	}
	.action {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;

		& button {
			min-width: 6rem;
		}
	}
</style>
