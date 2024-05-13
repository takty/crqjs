<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import type { ButtonEventHandler } from "bits-ui";
	import Menubar from "./Menubar.svelte";

	import {
		HardDriveDownload,
		Play,
	} from "lucide-svelte";

	export let handler: ((id: string) => void)|null = null;

	const el = (e: ButtonEventHandler<MouseEvent>) => {
		if ('function' === typeof handler) {
			handler((e.target as HTMLElement).dataset.cmd ?? '');
		}
	}
</script>

<div class="container flex flex-col">
	<div class="flex items-center gap-2">
		<Menubar handler={handler} />

		<div class="ms-auto flex h-10 items-center space-x-1 py-1">
			<Button class="h-8" size="sm" variant="ghost" on:click={el} data-cmd="save"><HardDriveDownload class="h-4 w-4"/></Button>
			<Button class="h-8" size="sm" variant="ghost" on:click={el} data-cmd="run"><Play class="h-4 w-4"/></Button>
		</div>
	</div>
</div>
