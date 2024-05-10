<script lang="ts">
	/**
	 * Directory File Picker
	 *
	 * @author Takuto Yanagida
	 * @version 2024-05-10
	 */

	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	// import * as Select from "$lib/components/ui/select";

	import { createEventDispatcher } from "svelte";
	const dispatch = createEventDispatcher();

	export let dialog: HTMLDialogElement;
	export let message: string;

	let hDir: FileSystemDirectoryHandle | null = null;
	let hFns: { hFile: FileSystemFileHandle; name: string }[] = [];
	let curIdx = 0;
	let newFile: string | null = null;

	async function selectFolder() {
		try {
			// @ts-ignore
			hDir = await window.showDirectoryPicker();
		} catch (e) {
			return;
		}
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
		dispatch("close", [hDir, hFns[curIdx].hFile, newFile]);
	}

	function cancel() {
		dispatch("close", [null, null, null]);
	}
</script>

<dialog bind:this={dialog} class="border bg-background p-6 shadow-lg sm:rounded-lg">
	<div class="inner grid gap-6">
		<div class="font-bold">{message}</div>

		<div class="step grid gap-4 items-start auto-cols-auto">
			<div>1. Select a project folder</div>
			<Button class="w-full" variant="secondary" on:click={selectFolder}>Select Folder...</Button>

			<div class="col-span-2 flex gap-4 w-full ps-4 items-center mb-4">
				<Label for="selected">Current Folder:</Label>
				<div id="selected" class="grow leading-5 py-1 w-64 min-h-8 border-b border-gray-500 border-dashed">
					{#if hDir}{hDir.name}{/if}
				</div>
			</div>

			<div>2. Select a file from the folder</div>
			<!-- {#if hFns.length === 0}
			<Select.Root bind:selected={curIdx} portal={null} disabled>
				<Select.Trigger>
					<Select.Value placeholder="Select a file" />
				</Select.Trigger>
			</Select.Root>
			{:else}
			<Select.Root bind:selected={curIdx} portal={null}>
				<Select.Trigger>
					<Select.Value />
				</Select.Trigger>
				<Select.Content>
					{#each hFns as hFn, i}
					<Select.Item value={i}>{hFn.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			{/if} -->
			{#if hFns.length === 0}
				<select class="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled>
					<option>No files</option>
				</select>
			{:else}
				<select class="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" bind:value={curIdx}>
					{#each hFns as hFn, i}
						<option value={i}>{hFn.name}</option>
					{/each}
				</select>
			{/if}

			<div class="col-span-2 flex gap-4 w-full ps-4 items-center">
				<Label for="file-name">File Name:</Label>
				<Input class="grow py-1 w-64 min-h-8 leading-5" id="file-name" type="text" bind:value={newFile} />
			</div>
		</div>

		<div class="flex justify-end gap-4">
			<Button class="min-w-24" variant="secondary" on:click={open} disabled={hFns.length === 0}>Open</Button>
			<Button class="min-w-24" variant="secondary" on:click={cancel}>Cancel</Button>
		</div>
	</div>
</dialog>

<style>
</style>
