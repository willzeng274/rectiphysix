<script lang="ts">
  import { T } from "@threlte/core";
	import { Grid, interactivity, OrbitControls } from "@threlte/extras";
	// import { TransformControls } from "@threlte/extras";
  import Object from "./Object";
	import { Collider, Debug, RigidBody, useRapier } from "@threlte/rapier";
  import { Pane, Button, Point, Checkbox } from "svelte-tweakpane-ui"
	import { physicsActive, resetRotation } from "$lib/stores";
	import Root from "./Root.svelte";

  let objects = ["test"];
  let selected = "test";

  let gravity = {
    x: 0,
    y: -9.807,
    z: 0
  };

  interactivity();

  const { world } = useRapier();

  physicsActive.subscribe((v) => {
    world.gravity = v ? gravity : { x: 0, y: 0, z: 0 };
  });

  resetRotation.subscribe((v) => {
    if (v) resetRotation.set(false);
  });
</script>

<Root>
  <Pane
    title="Rectiphysix management panel"
    position="fixed"
  >
    <Checkbox
      label="Physics enabled"
      bind:value={$physicsActive}
    />

    <Point
      bind:value={gravity}
      label="Gravity values"
    />
    <Button
      title="Reset all rotation"
      on:click={() => {
        resetRotation.update((v) => !v);
      }}
    />
    <Button
      title="Add object"
      on:click={() => {
        const newObj = prompt("Please provide an unique id");
        if (newObj) {
          objects = [...objects, newObj];
        }
      }}
    />
  </Pane>
</Root>

<T.PerspectiveCamera
  makeDefault
  position={[-10, 10, 10]}
  fov={15}
>
  <OrbitControls
    enableZoom
    enableDamping
  />
</T.PerspectiveCamera>

<T.AmbientLight intensity={1} />

<!-- implement key so there can be "selection" system -->

{#each objects as key (key)}
  <Object.View {key} selected={selected === key} on:select={() => selected = key} />
{/each}

<!-- Debug -->
<Debug />

<!-- Ground -->
<Grid
  cellColor="white"
  sectionColor="white"
/>
<RigidBody
  type="fixed"
  userData={{
    name: "ground"
  }}
>
  <Collider
    shape="cuboid"
    args={[10, 0, 10]}
    friction={10000}
    restitution={0}
  />
</RigidBody>