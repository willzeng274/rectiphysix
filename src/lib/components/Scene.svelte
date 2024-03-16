<script lang="ts">
  import { T } from "@threlte/core";
	import { interactivity } from "@threlte/extras";
	// import { TransformControls } from "@threlte/extras";
  import { OrbitControls } from "@threlte/extras";
  import Object from "./Object";
	import { Collider, Debug, RigidBody } from "@threlte/rapier";
  import { Pane, Button, Slider } from "svelte-tweakpane-ui"
	// import { BoxGeometry, MeshBasicMaterial } from "three";

  let number: number;

  let group: THREE.Group | undefined;

  interactivity();

  let enablePhysics = false;
</script>

<Pane
  title="Rectiphysix management panel"
  position="fixed"
>
  <Button
    title={enablePhysics ? "Pause physics" : "Run physics"}
    on:click={() => {
      enablePhysics = !enablePhysics;
    }}
  />
  <Slider
    bind:value={number}
    label="Number of Objects"
    min={20}
    max={100}
    step={10}
  />
</Pane>

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

<Object.View bind:group>
  <Object.Physics slot="physics">
    <!-- <RigidBody
      bind:rigidBody
    >
      <Collider
        shape="cuboid"
        args={[1/2, 2/2, 1/2]}
      /> -->

    <!-- </RigidBody> -->
  </Object.Physics>
  <T.Mesh>
    <T.BoxGeometry args={[1, 2, 1]}></T.BoxGeometry>
    <T.MeshBasicMaterial color="#ffffff"></T.MeshBasicMaterial>
  </T.Mesh>
</Object.View>

<Debug />

<T.GridHelper />