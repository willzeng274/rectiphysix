<script lang="ts">
	import { T, useTask } from "@threlte/core";
	import { TransformControls } from "@threlte/extras";
	import { Collider, RigidBody, useRapier } from "@threlte/rapier";
	import { TransformControls as THREETransformControls } from "three/examples/jsm/Addons.js";
	import {
		type RigidBody as RapierRigidBody,
		RigidBodyType,
		type Collider as RapierCollider,
		Ball,
		Cuboid,
		Capsule,
		Cylinder,
	} from "@dimforge/rapier3d-compat";
	import {
		BoxGeometry,
		CapsuleGeometry,
		CylinderGeometry,
		MeshBasicMaterial,
		Quaternion,
		SphereGeometry,
		Vector3,
	} from "three";
	import {
		globalState,
		physicsActive,
		resetRotation,
		type KeyedItem,
	} from "$lib/stores";
	import { createEventDispatcher, onDestroy, onMount } from "svelte";
	import {
		Pane,
		Point,
		Text,
		type PointValue3d,
		type PointValue4d,
		Checkbox,
		RadioGrid,
		Color,
		Button,
		TabGroup,
		TabPage,
		ThemeUtils,
	} from "svelte-tweakpane-ui";
	import Root from "../Root.svelte";

	// const { world } = useRapier();

	type Mode = "translate" | "rotate" | "scale";

	export let key: string;

	export let selected: boolean;

	let modes: Mode[] = ["translate", "rotate", "scale"];

	let mode = 0;

	let lastClick = 0;

	export let resetOnGround: boolean;

	let controls: THREETransformControls | undefined;

	const dispatch = createEventDispatcher<{
		select: void;
		delete: void;
	}>();

	function toggleMode() {
		// console.log("ok");
		// because of physics compatibility we are disabling scaling
		if (mode === 1) mode = 0;
		else mode++;
		// if (mode === 2) mode = 0;
		// else mode++;
	}

	$: {
		// console.log("new mode", mode);
		// console.log("size", controls?.size);
		controls?.setMode(modes[mode]);
	}

	function mouseUp() {
		if (Date.now() - lastClick < 500) {
			// console.log("toggle mode");
			toggleMode();
		}
		lastClick = Date.now();
	}

	let group: THREE.Group | undefined;

	// export let exportedPosition: {
	// 	x: number;
	// 	y: number;
	// 	z: number;
	// };
	// export let exportedPosition: [number, number, number];
	export let positionX: number;
	export let positionY: number;
	export let positionZ: number;
	export let exportedRotation: [number, number, number, number];

	// console.log("rot", exportedRotation);

	let position = new Vector3(0, 0, 0);
	let rotation = new Quaternion(0, 0, 0, 1);

	let mounted = false;

	onMount(() => {
		// if (!group) alert("go fuck yourself");
		group?.position.set(positionX, positionY, positionZ);
		group?.quaternion.set(
			exportedRotation[0],
			exportedRotation[1],
			exportedRotation[2],
			exportedRotation[3],
		);
		// group?.position.set(exportedPosition.x, exportedPosition.y, exportedPosition.z);
		// group?.quaternion.set(exportedRotation.x, exportedRotation.y, exportedRotation.z, exportedRotation.w);
		// console.log("group", group?.position, group?.quaternion);
		// position = new Vector3(exportedPosition.x, exportedPosition.y, exportedPosition.z);
		// rotation = new Quaternion(exportedRotation.x, exportedRotation.y, exportedRotation.z, exportedRotation.w);
		positionInput = [positionX, positionY, positionZ];
		rotationInput = [
			exportedRotation[0],
			exportedRotation[1],
			exportedRotation[2],
			exportedRotation[3],
		];
		mounted = true;
	});

	let positionInput: PointValue3d = [position.x, position.y, position.z];
	let rotationInput: PointValue4d = [
		exportedRotation[0],
		exportedRotation[1],
		exportedRotation[2],
		exportedRotation[3],
	];
	export let initialLinvel: PointValue3d;

	export let time: number;
	let startTime: number = 0;
	let timerActive: boolean = false;

	useTask(() => {
		if (!group || !rigidBody) return;
		if (timerActive) {
			time = (Date.now() - startTime) / 1000;
		}
		if ($physicsActive) {
			const tl = rigidBody.translation();
			rigidBody.wakeUp();
			// console.log(rigidBody.isSleeping(), rigidBody.isEnabled(), rigidBody.isMoving(), rigidBody.mass());
			const qt = rigidBody.rotation();
			const pos = new Vector3(tl.x, tl.y, tl.z);
			const rot = new Quaternion(qt.x, qt.y, qt.z, qt.w);
			if (!position.equals(pos)) {
				position = pos;
				positionInput = [position.x, position.y, position.z];
				group.position.set(pos.x, pos.y, pos.z);
			}
			if (!rotation.equals(rot)) {
				rotation = rot;
				rotationInput = [
					rotation.x,
					rotation.y,
					rotation.z,
					rotation.w,
				];
				group.quaternion.set(rot.x, rot.y, rot.z, rot.w);
			}
		} else {
			if (!position.equals(group.position)) {
				position = group.position.clone();
				rigidBody.setTranslation(position, false);
				positionInput = [position.x, position.y, position.z];
			}
			if (!rotation.equals(group.quaternion)) {
				rotation = group.quaternion.clone();
				rigidBody.setRotation(rotation, false);
				rotationInput = [
					rotation.x,
					rotation.y,
					rotation.z,
					rotation.w,
				];
			}
		}
	});

	let rigidBody: RapierRigidBody | undefined;

	resetRotation.subscribe((val) => {
		if (!rigidBody || !group) return;
		if (val) {
			let rot = new Quaternion(0, 0, 0, 1);
			rigidBody.setRotation(rot, false);
			group.quaternion.set(rot.x, rot.y, rot.z, rot.w);
			rotationInput = [0, 0, 0, 1];
			rotation = rot;
		}
	});

	physicsActive.subscribe((val) => {
		if (!rigidBody || !controls) return;
		if (val) {
			// physics just got enabled
			// disable the transform controls because it leads to undefined behaviours

			// doesn't stack... it counts from the old start time
			// if (startTime === 0) {
			// 	// first time tick
			// 	startTime = Date.now();
			// }
			startTime = Date.now();
			timerActive = true;
			controls.enabled = false;
			controls.visible = false;
			rigidBody.setBodyType(RigidBodyType.Dynamic, false);
			rigidBody.resetForces(false);
			rigidBody.resetTorques(false);
			rigidBody.setLinvel(
				{
					x: (initialLinvel as number[])[0],
					y: (initialLinvel as number[])[1],
					z: (initialLinvel as number[])[2],
				},
				true,
			);
			rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, false);
		} else {
			// physics just got disabled
			// enable the transform controls back
			controls.visible = true;
			controls.enabled = true;
			rigidBody.setBodyType(RigidBodyType.Fixed, false);
			// since we are resetting everything on re-enable
			// (which makes sense because enabling physics should take more time than disabling it)
		}
	});

	export let geometryType: "Box" | "Capsule" | "Sphere" | "Cylinder";

	type geometryArgType = {
		Box: PointValue3d;
		Capsule: PointValue4d;
		Sphere: PointValue3d;
		Cylinder: PointValue4d;
	};

	export let args: geometryArgType;

	let collider: RapierCollider | undefined;

	let colliderArgs = [1 / 2, 1 / 2, 1 / 2] as any;

	let geometry:
		| THREE.BoxGeometry
		| THREE.CapsuleGeometry
		| THREE.SphereGeometry
		| THREE.CylinderGeometry = new BoxGeometry(1, 1, 1);
	export let color: string;

	$: {
		// console.log(args);
		if (!collider) break $;
		switch (geometryType) {
			case "Box":
				geometry = new BoxGeometry(...(args.Box as number[]));
				colliderArgs = (args.Box as number[]).map((i) => i / 2);
				collider.setShape(
					new Cuboid(...(colliderArgs as [number, number, number])),
				);
				break;
			case "Capsule":
				geometry = new CapsuleGeometry(...(args.Capsule as number[]));
				colliderArgs = [
					((args.Capsule as number[])[1] / 2) * 1,
					(args.Capsule as number[])[0],
				];
				collider.setShape(
					new Capsule(...(colliderArgs as [number, number])),
				);
				break;
			case "Sphere":
				geometry = new SphereGeometry(...(args.Sphere as number[]));
				colliderArgs = [(args.Sphere as number[])[0]];
				collider.setShape(new Ball(...(colliderArgs as [number])));
				break;
			case "Cylinder":
				geometry = new CylinderGeometry(...(args.Cylinder as number[]));
				colliderArgs = [
					(args.Cylinder as number[])[2] / 2,
					(args.Cylinder as number[])[1],
				];
				collider.setShape(
					new Cylinder(...(colliderArgs as [number, number])),
				);
				break;
		}
	}

	onDestroy(() => {
		rigidBody = undefined;
	});

	$: {
		if (!group) break $;
		if (!$physicsActive) {
			group.position.set(
				(positionInput as number[])[0],
				(positionInput as number[])[1],
				(positionInput as number[])[2],
			);
			group.quaternion.set(
				(rotationInput as number[])[0],
				(rotationInput as number[])[1],
				(rotationInput as number[])[2],
				(rotationInput as number[])[3],
			);
		}
	}

	$: {
		if (!$physicsActive && controls) {
			if (selected) {
				controls.visible = true;
				controls.enabled = true;
			} else {
				controls.visible = false;
				controls.enabled = false;
			}
		}
	}

	$: {
		globalState.update((s) => {
			if (s === null) return null;
			return {
				...s,
				default: {
					...s["default"],
					[key]: {
						position,
						rotation: [
							rotation.x,
							rotation.y,
							rotation.z,
							rotation.w,
						],
						resetOnGround,
						initialVelocity: initialLinvel as [
							number,
							number,
							number,
						],
						timer: time,
						geometryType,
						geometryArgs: args,
						color,
					} as KeyedItem,
				},
			};
		});
	}
</script>

{#if mounted}
	<Root>
		<Pane
			title={"Object: " + key}
			storePositionLocally
			localStoreId={key}
			expanded={selected || undefined}
			theme={selected
				? ThemeUtils.presets.vivid
				: ThemeUtils.presets.standard}
			on:change={(e) => console.log(e)}
		>
			<TabGroup>
				<TabPage title="World" disabled={$physicsActive}>
					<Point bind:value={positionInput} label="Position" />
					<Point
						bind:value={rotationInput}
						min={-1}
						max={1}
						label="Rotation"
					/>
					<Button
						title="Reset rotation"
						on:click={() => {
							if (!rigidBody || !group) return;
							let rot = new Quaternion(0, 0, 0, 1);
							rigidBody.setRotation(rot, false);
							group.quaternion.set(rot.x, rot.y, rot.z, rot.w);
							rotationInput = [0, 0, 0, 1];
							rotation = rot;
						}}
					/>
				</TabPage>
				<TabPage title="Physics">
					<Checkbox
						bind:value={resetOnGround}
						label="Reset on ground"
						disabled={$physicsActive}
					/>
					<Point
						bind:value={initialLinvel}
						label="Initial velocity"
						disabled={$physicsActive}
					/>
					<Text
						value={"Time: " + Math.round(time * 100) / 100 + "s"}
						disabled
					/>
					<Button
						title="Reset time"
						on:click={() => {
							startTime = Date.now();
							time = 0;
						}}
					/>
				</TabPage>
				<TabPage title="Material" disabled={$physicsActive}>
					<RadioGrid
						label="Mesh geometry"
						bind:value={geometryType}
						values={["Box", "Capsule", "Sphere", "Cylinder"]}
					/>
					{#if geometryType === "Box" || geometryType === "Sphere"}
						<Point label="Args" bind:value={args[geometryType]} />
					{:else}
						<Point label="Args" bind:value={args[geometryType]} />
					{/if}
					<Color bind:value={color} label="Mesh colour" />
				</TabPage>
				<TabPage title="Other" disabled={$physicsActive}>
					<Button
						title="Delete object"
						on:click={() => {
							dispatch("delete");
						}}
					/>
				</TabPage>
			</TabGroup>
		</Pane>
	</Root>
{/if}

<RigidBody
	on:create={() => {
		// console.log("called RESET");
		rigidBody?.setTranslation(position, false);
		rigidBody?.setRotation(rotation, false);
	}}
	bind:rigidBody
	type="fixed"
	userData={{
		name: key,
	}}
	on:collisionenter={({ targetRigidBody }) => {
		// console.log("USerd", targetRigidBody?.userData);
		if (!targetRigidBody || !rigidBody) return;
		// @ts-ignore
		if (targetRigidBody.userData.name === "ground" && resetOnGround) {
			timerActive = false;
			rigidBody.resetForces(false);
			rigidBody.resetTorques(false);
			rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, false);
			rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, false);
		}
	}}
>
	<Collider
		bind:collider
		shape="cuboid"
		args={[1 / 2, 1 / 2, 1 / 2]}
		friction={10000}
		restitution={0}
	/>
	<slot name="physics" />
</RigidBody>

<TransformControls bind:controls on:mouseUp={mouseUp} bind:group>
	<slot />
	<T.Mesh
		{geometry}
		material={new MeshBasicMaterial({ color })}
		on:click={() => dispatch("select")}
	/>
</TransformControls>
