<script lang="ts">
	import { T } from "@threlte/core";
	import { Grid, interactivity, OrbitControls } from "@threlte/extras";
	// import { TransformControls } from "@threlte/extras";
	import RObject from "./Object";
	import { Collider, Debug, RigidBody, useRapier } from "@threlte/rapier";
	import { Pane, Button, Point, Checkbox, Text } from "svelte-tweakpane-ui";
	import { globalState, physicsActive, resetRotation, type Project, type KeyedItem } from "$lib/stores";
	import Root from "./Root.svelte";
	import { createEventDispatcher, onMount } from "svelte";

	let objects: (KeyedItem & { key: string })[] = [];
	let selected = "";

	// default value
	let gravity = {
		x: 0,
		y: -9.807,
		z: 0,
	};

	let mounted = false;

	interactivity();

	const { world } = useRapier();

  const dispatch = createEventDispatcher<{
    restart: void
  }>();

	physicsActive.subscribe((v) => {
		// world.gravity = v ? gravity : { x: 0, y: 0, z: 0 };
		world.gravity = v ? gravity : { x: 0, y: 0, z: 0 };
	});

	resetRotation.subscribe((v) => {
		if (v) resetRotation.set(false);
	});

	onMount(() => {
		const saved = localStorage.getItem("rectiphysix-state");
		if (saved) {
			const obj = JSON.parse(saved);
			globalState.set(obj);
			gravity = obj.default.gravity;
			objects = Object.entries(obj.default)
				.filter((o) => o[0] !== "gravity")
				.map(([k, v]) => ({
					key: k,
					...(v as KeyedItem),
				}));
		} else {
			globalState.set({});
		}
		mounted = true;
	});

	function newObject() {
		const newObj = prompt("Please provide an unique id");
		if (newObj === "gravity") {
			alert('Object cannot be named "gravity"!');
			return;
		}
		if (newObj) {
			objects = [
				...objects,
				{
					key: newObj,
					position: {
						x: 0,
						y: 0,
						z: 0,
					},
					rotation: [0, 0, 0, 1],
					resetOnGround: false,
					initialVelocity: [0, 0, 0],
					timer: 0,
					geometryType: "Box",
					geometryArgs: {
						Box: [1, 1, 1],
						Capsule: [1, 1, 16, 16],
						Sphere: [1, 16, 16],
						Cylinder: [1, 1, 2, 16],
					},
					color: "#ffffff",
				},
			];
		}
	}

	$: {
		globalState.update((s) => {
			if (s === null) return null;
			return {
				...s,
				default: {
					...s["default"],
					gravity,
				} as Project,
			};
		});
	}

	let dummy: boolean = false;
</script>

<svelte:window on:keydown={(e) => e.key === "Escape" && (selected = "")} />

{#if mounted}
	<Root>
		<Pane title="Rectiphysix management panel" position="fixed">
      <Text value="Project: default" disabled />
			<Checkbox label="Physics enabled" bind:value={dummy} on:change={(e) => physicsActive.set(e.detail.value)} />

			<Point bind:value={gravity} label="Gravity values" />
			<Button
				title="Reset all rotation"
				on:click={() => {
					resetRotation.update((v) => !v);
				}}
			/>
			<Button
				title="Save"
				on:click={() => {
					// console.log($globalState);
					localStorage.setItem("rectiphysix-state", JSON.stringify($globalState));
				}}
			/>
			<Button title="Load last saved" on:click={() => {
        dispatch("restart");
      }} />
			<Button title="Add object" on:click={newObject} />
		</Pane>
	</Root>
{/if}

<T.PerspectiveCamera makeDefault position={[10, 10, -10]} fov={90}>
	<OrbitControls enableZoom enableDamping />
</T.PerspectiveCamera>

<T.AmbientLight intensity={1} />

<!-- Loaded from localstorage -->
{#if $globalState !== null}
	{#each objects as obj (obj.key)}
		<RObject.View
			key={obj.key}
			initialLinvel={obj.initialVelocity}
			time={obj.timer}
			resetOnGround={obj.resetOnGround}
			color={obj.color}
			positionX={obj.position.x}
			positionY={obj.position.y}
			positionZ={obj.position.z}
			exportedRotation={obj.rotation}
			geometryType={obj.geometryType}
			args={obj.geometryArgs}
			selected={selected === obj.key}
			on:select={() => (selected = obj.key)}
			on:delete={() => {
				objects = objects.filter((k) => k.key !== obj.key);
				localStorage.removeItem(`svelte-tweakpane-ui-draggable-position-${obj.key}`);
			}}
		/>
	{/each}
{/if}

<!-- Debug -->
<Debug />

<!-- Ground -->
<Grid cellColor="white" sectionColor="white" />
<RigidBody
	type="fixed"
	userData={{
		name: "ground",
	}}
>
	<Collider shape="cuboid" args={[10, 0, 10]} friction={10000} restitution={0} />
</RigidBody>
