<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import type { ButtonEventHandler } from "bits-ui";
	import SideMenu from "./SideMenu.svelte";

	export let handler: ((id: string) => void)|null = null;

	const el = (e: ButtonEventHandler<MouseEvent>) => {
		if ('function' === typeof handler) {
			handler((e.target as Element).id ?? '');
		}
	}
</script>

<div class="container flex items-start justify-between items-center px-4 py-4 gap-2">
	<SideMenu />

	<h2 class="text-lg font-semibold">Crqjs</h2>

	<div class="ml-auto flex w-full space-x-2 sm:justify-end">
		<Button variant="secondary" on:click={el} id="open">Open...</Button>
		<Button variant="secondary" on:click={el} id="save">Save</Button>
		<Button variant="secondary" on:click={el} id="save-as">Save As...</Button>
		<Button variant="secondary" on:click={el} id="run">Run</Button>
	</div>
</div>
