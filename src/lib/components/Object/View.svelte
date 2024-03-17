<script lang="ts">
	import { TransformControls } from "@threlte/extras";
	import { RigidBody } from "@threlte/rapier";
	import { TransformControls as THREETransformControls } from "three/examples/jsm/Addons.js";
	import { RigidBody as RapierRigidBody, RigidBodyType } from "@dimforge/rapier3d-compat";
	import { useTask } from "@threlte/core";
	import { Quaternion, Vector3 } from "three";
	import { physicsActive, resetRotation } from "$lib/stores";
	import { onDestroy } from "svelte";
	import { Pane, Point, Text, type PointValue3d, type PointValue4d, Checkbox } from "svelte-tweakpane-ui";
	import Root from "../Root.svelte";
	import { label } from "three/examples/jsm/nodes/Nodes.js";

	type Mode = "translate" | "rotate" | "scale";

	export let key: string;

	let modes: Mode[] = ["translate", "rotate", "scale"];

	let mode = 0;

	let lastClick = 0;

	let resetOnGround = false;

	let controls: THREETransformControls | undefined;

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

	export let group: THREE.Group | undefined;

	let position: THREE.Vector3 = group?.position || new Vector3(0, 0, 0);
	let rotation: THREE.Quaternion = group?.quaternion || new Quaternion(0, 0, 0, 1);

	let positionInput: PointValue3d = [0, 0, 0];
	let rotationInput: PointValue4d = [0, 0, 0, 1];
	let initialLinvel: PointValue3d = [0, 0, 0];

	useTask(() => {
		if (!group || !rigidBody) return;
		if ($physicsActive) {
			const tl = rigidBody.translation();
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
				rotationInput = [rotation.x, rotation.y, rotation.z, rotation.w];
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
				rotationInput = [rotation.x, rotation.y, rotation.z, rotation.w];
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
			controls.enabled = false;
			controls.visible = false;
			rigidBody.setBodyType(RigidBodyType.Dynamic, false);
			rigidBody.resetForces(false);
			rigidBody.resetTorques(false);
			rigidBody.setLinvel({ x: (initialLinvel as number[])[0], y: (initialLinvel as number[])[1], z: (initialLinvel as number[])[2] }, false);
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

	onDestroy(() => {
		rigidBody = undefined;
	});

	$: {
		if (!group) break $;
		if (!$physicsActive) {
			// console.log("Tweaking", positionInput);
			group.position.set((positionInput as number[])[0], (positionInput as number[])[1], (positionInput as number[])[2]);
			// console.log(group.position);
			group.quaternion.set((rotationInput as number[])[0], (rotationInput as number[])[1], (rotationInput as number[])[2], (rotationInput as number[])[3]);
		}
	}
</script>

<Root>
	<Pane
		title={"Object: " + key}
		storePositionLocally
		localStoreId={key}
	>
		<Checkbox
			bind:value={resetOnGround}
			label="Reset on ground"
		/>
		<Text
			value="Properties"
			disabled
		/>
		<Point
			bind:value={positionInput}
			label="Position"
		/>
		<Point
			bind:value={rotationInput}
			min={-1}
			max={1}
			label="Rotation"
		/>
		<Point
			bind:value={initialLinvel}
			label="Initial velocity"
		/>
	</Pane>
</Root>

<RigidBody
	bind:rigidBody
	type="fixed"
	userData={{
		name: key
	}}
	on:collisionenter={({ targetRigidBody }) => {
		// console.log("USerd", targetRigidBody?.userData);
		if (!targetRigidBody || !rigidBody) return;
		// @ts-ignore
		if (targetRigidBody.userData.name === "ground" && resetOnGround) {
			rigidBody.resetForces(false);
			rigidBody.resetTorques(false);
			rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, false);
			rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, false);
		}
	}}
>
	<slot name="physics" />
</RigidBody>

<TransformControls bind:controls on:mouseUp={mouseUp} bind:group>
	<slot />
</TransformControls>
