<script lang="ts">
	import { TransformControls } from "@threlte/extras";
    import { TransformControls as THREETransformControls } from "three/examples/jsm/Addons.js";

	type Mode = "translate" | "rotate" | "scale";

	let modes: Mode[] = ["translate", "rotate", "scale"];

	let mode = 0;

	let lastClick = 0;

    let controls: THREETransformControls | undefined;

	function toggleMode() {
		// console.log("ok");
		if (mode === 2) mode = 0;
		else mode++;
	}

	$: {
		// console.log("size", controls?.size);
		controls?.setMode(modes[mode]);
	}

	function mouseUp() {
		if (Date.now() - lastClick < 500) {
			toggleMode();
		}
		lastClick = Date.now();
	}

    export let group: THREE.Group | undefined;
</script>

<slot name="physics"  />

<TransformControls bind:controls on:mouseUp={mouseUp} bind:group>
	<slot />
</TransformControls>
