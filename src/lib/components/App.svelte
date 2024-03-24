<script lang="ts">
	import { Canvas } from "@threlte/core";
	import Scene from "./Scene.svelte";
	import { World } from "@threlte/rapier";
	import { Sky } from "@threlte/extras";
	import * as Sheet from "$lib/components/ui/sheet";
	import { onMount } from "svelte";
	import { globalState, savedState, type Project } from "$lib/stores";
	import { crossfade } from "svelte/transition";
	import { quintOut } from "svelte/easing";
	import { flip } from "svelte/animate";

	let unique = {};

	let selected = "default";

	let projects = ["default"];

	let changes = false;

	function addProject() {
		const title = prompt("Enter project title");
		if (title) {
			projects = [...projects, title];
			// don't need to update globalState because any operations within the project will create the project object
      // but because of the deepEqual we have to do it
      globalState.update((s) => {
				if (s === null) return null;
				return {
					...s,
					[title]: {
						gravity: {
							x: 0,
							y: -9.807,
							z: 0,
						},
						position: projects.length - 1, // because we just added it
					} as Project,
				};
			});
			savedState.update((s) => {
				if (s === null) return null;
				return {
					...s,
					[title]: {
						gravity: {
							x: 0,
							y: -9.807,
							z: 0,
						},
						position: projects.length - 1, // because we just added it
					} as Project,
				};
			});
		}
	}

	function removeProject(proj: string) {
		projects = projects.filter((p) => p !== proj);
    globalState.update((s) => {
			if (s === null) return null;
			const { [proj]: _, ...res } = s;
			return {
				...res,
			};
		});
		savedState.update((s) => {
			if (s === null) return null;
			const { [proj]: _, ...res } = s;
			return {
				...res,
			};
		});
	}

	onMount(() => {
		const saved = localStorage.getItem("rectiphysix-state");
		if (saved) {
			const obj = JSON.parse(saved);
			globalState.set(obj);
			savedState.set(obj);
			let projs = Object.entries(obj).map(([k, v], ind) => ({ id: k, s: (v as any).position || ind }));
			projs.sort((a, b) => +(a.s > b.s) - +(a.s < b.s));
			projects = projs.map((i) => i.id);
		} else {
			globalState.set({});
			savedState.set({});
		}
	});

	$: {
		if (selected) {
			unique = {};
		}
	}

	function deepEqual(a: any, b: any): boolean {
		if (a === b) return true;
		if (!(a instanceof Object) || !(b instanceof Object)) return false;
		const keys = Object.keys(a);
		return keys.length === Object.keys(b).length && keys.every((k) => deepEqual(a[k], b[k]));
	}

	savedState.subscribe((s) => {
		if (deepEqual(s, $globalState)) changes = false;
	});
	globalState.subscribe((_) => (changes = true));

	// $: {
	// 	console.log(changes);
	// }

	let isOver: boolean | string = false;
	const getDraggedParent = (node: HTMLElement): DOMStringMap =>
		node.dataset && node.dataset.id ? node.dataset : getDraggedParent(node.parentElement as HTMLElement);

	const reorder = ({ from, to }: { from: number; to: number }) => {
		let newList = [...projects];
		const fromProj = newList[from];
		const toProj = newList[to];
		newList[from] = [newList[to], (newList[to] = newList[from])][0];
		// console.log("Reorder", projects, newList, from, to);
		projects = newList;
    globalState.update((s) => {
			if (s === null) return null;
			return {
				...s,
				[fromProj]: {
					...s[fromProj],
					position: to,
				} as Project,
				[toProj]: {
					...s[toProj],
					position: from,
				} as Project,
			};
		});
		savedState.update((s) => {
			if (s === null) return null;
			return {
				...s,
				[fromProj]: {
					...s[fromProj],
					position: to,
				} as Project,
				[toProj]: {
					...s[toProj],
					position: from,
				} as Project,
			};
		});
		// dispatch("sort", newList);
	};

	function start(ev: DragEvent) {
		// console.log("Start", ev.target?.dataset);
		ev.dataTransfer?.setData("source", (ev.target as HTMLDataListElement).dataset.index!);
	}

	function over(ev: DragEvent) {
		ev.preventDefault();
		let dragged = getDraggedParent(ev.target as HTMLElement);
		// console.log("Over", dragged);
		if (isOver !== dragged.id) isOver = dragged.id!;
	}

	function leave(ev: DragEvent) {
		let dragged = getDraggedParent(ev.target as HTMLElement);
		// console.log("Leave", dragged);
		if (isOver === dragged.id) isOver = false;
	}

	function drop(ev: DragEvent) {
		isOver = false;
		ev.preventDefault();
		let dragged = getDraggedParent(ev.target as HTMLElement);
		let from = ev.dataTransfer?.getData("source");
		let to = dragged.index;
		// console.log("Drop", dragged, from, to);
		reorder({ from: Number(from), to: Number(to) });
	}

	const [send, receive] = crossfade({
		duration: (d) => Math.sqrt(d * 200),

		fallback(node, params) {
			const style = getComputedStyle(node);
			const transform = style.transform === "none" ? "" : style.transform;

			return {
				duration: 600,
				easing: quintOut,
				css: (t) => `
            transform: ${transform} scale(${t});
            opacity: ${t}
        `,
			};
		},
	});
</script>

<svelte:window
	on:beforeunload={(e) => changes && [
		e.preventDefault(),
		(e.returnValue = "Are you sure you want to leave? Some changes may not be saved."),
	]}
/>

<Sheet.Root>
	<Sheet.Trigger class="z-[5000] bg-white text-black rounded-sm fixed py-1 px-2 text-sm">View projects</Sheet.Trigger>
	<Sheet.Content side="left" class="z-[5000]">
		<Sheet.Header>
			<Sheet.Title class="mb-8">Rectiphysix projects</Sheet.Title>
			<Sheet.Description class="flex flex-col">
				{#if $globalState}
					<ul class="w-full">
						{#each projects as proj, index (proj)}
							<li
								class="w-full mb-4"
								data-index={index}
								data-id={proj}
								draggable="true"
								on:dragstart={start}
								on:dragover={over}
								on:dragleave={leave}
								on:drop={drop}
								in:receive={{ key: proj }}
								out:send={{ key: proj }}
								animate:flip={{ duration: 300 }}
								class:over={proj === isOver}
							>
								{#if proj === "default"}
									<button
										class="w-full inline-flex items-center justify-center rounded-md text-sm font-medium whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
										on:click={() => {
											selected = proj;
										}}
										class:selected={selected === proj}>{proj}</button
									>
								{:else}
									<button
										class="w-full inline-flex items-center justify-center rounded-md text-sm font-medium whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
										on:click={() => {
											selected = proj;
										}}
										class:selected={selected === proj}
									>
										<span class="flex-grow">{proj}</span>
										<button
											class="text-red"
											on:click={() => {
												if (confirm(`Are you sure you want to delete ${proj}?`)) {
													removeProject(proj);
												}
											}}>X</button
										>
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
				<button
					class="inline-flex items-center justify-center rounded-md text-sm font-medium whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
					on:click={addProject}>Add project</button
				>
			</Sheet.Description>
		</Sheet.Header>
	</Sheet.Content>
</Sheet.Root>

<!-- because Scene needs globalState onMount -->
{#if $globalState}
	<Canvas>
		<Sky setEnvironment turbidity={10} rayleigh={3} azimuth={180} elevation={0.5} mieCoefficient={0.005} mieDirectionalG={0.7} />
		<World gravity={[0, 0, 0]}>
			{#key unique}
				<Scene project={selected} on:restart={() => (unique = {})} />
			{/key}
		</World>
	</Canvas>
{/if}

<style lang="postcss">
	.selected {
		@apply inline-flex items-center justify-center rounded-md text-sm font-medium whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-4 py-2;
	}
</style>
