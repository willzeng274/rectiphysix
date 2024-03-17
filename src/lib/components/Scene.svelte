<script lang="ts">
  import { T } from "@threlte/core";
	import { Grid, interactivity, OrbitControls } from "@threlte/extras";
	// import { TransformControls } from "@threlte/extras";
  import Object from "./Object";
	import { Collider, Debug, RigidBody, useRapier } from "@threlte/rapier";
  import { Pane, Button, Point, Checkbox, Color, RadioGrid, type PointValue3d, type PointValue4d } from "svelte-tweakpane-ui"
	import { physicsActive, resetRotation } from "$lib/stores";
	import { BoxGeometry, CapsuleGeometry, CylinderGeometry, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from "three";
	import { type Collider as RapierCollider, Ball, Cuboid, Capsule, Cylinder } from "@dimforge/rapier3d-compat";
	import Root from "./Root.svelte";
	// import { Mesh } from "three";

  let group: THREE.Group | undefined;

  let geometryType: "Box" | "Capsule" | "Sphere" | "Cylinder" = "Box";
  let args = {
    Box: [1, 1, 1] as PointValue3d,
    Capsule: [1, 1, 16, 16] as PointValue4d,
    Sphere: [1, 16, 16] as PointValue3d,
    Cylinder: [1, 1, 2, 16] as PointValue4d
  };

  let collider: RapierCollider | undefined;

  let colliderArgs = [1/2, 1/2, 1/2] as any;

  let geometry: THREE.BoxGeometry | THREE.CapsuleGeometry | THREE.SphereGeometry | THREE.CylinderGeometry = new BoxGeometry(1, 1, 1);
  let color = "#ffffff";

  $: {
    // console.log(args);
    if (!collider) break $;
    switch (geometryType) {
      case "Box":
        geometry = new BoxGeometry(...args.Box as number[]);
        colliderArgs = (args.Box as number[]).map((i) => i/2);
        collider.setShape(new Cuboid(...colliderArgs as [number, number, number]));
        break;
      case "Capsule":
        geometry = new CapsuleGeometry(...args.Capsule as number[]);
        colliderArgs = [(args.Capsule as number[])[1]/2*1, (args.Capsule as number[])[0]];
        collider.setShape(new Capsule(...colliderArgs as [number, number]));
        break;
      case "Sphere":
        geometry = new SphereGeometry(...args.Sphere as number[]);
        colliderArgs = [(args.Sphere as number[])[0]];
        collider.setShape(new Ball(...colliderArgs as [number]));
        break;
      case "Cylinder":
        geometry = new CylinderGeometry(...args.Cylinder as number[]);
        colliderArgs = [(args.Cylinder as number[])[2]/2, (args.Cylinder as number[])[1]];
        collider.setShape(new Cylinder(...colliderArgs as [number, number]));
        break
    }
  };

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
    <RadioGrid
      label="Mesh geometry"
      bind:value={geometryType}
      values={["Box", "Capsule", "Sphere", "Cylinder"]}
    />
    {#if geometryType === "Box" || geometryType === "Sphere"}
      <Point
        label="Args"
        bind:value={args[geometryType]}
      />
    {:else}
      <Point
        label="Args"
        bind:value={args[geometryType]}
      />
    {/if}
    <!-- <Button
      title="Toggle physics"
      on:click={() => {
        physicsActive.update((v) => !v);
      }}
    /> -->
    <Color
      bind:value={color}
      label="Mesh colour"
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

<Object.View bind:group key="test">
  <Object.Physics slot="physics">
    <Collider
      bind:collider
      shape="cuboid"
      args={[1/2, 1/2, 1/2]}
      friction={10000}
      restitution={0}
    />
  </Object.Physics>
  <T.Mesh
    {geometry}
    material={new MeshBasicMaterial({ color })}
  />
  <!-- <T.Mesh>
    <T.BoxGeometry args={[1, 1, 1]}></T.BoxGeometry>
    <T.MeshBasicMaterial color="#ffffff"></T.MeshBasicMaterial>
  </T.Mesh> -->
</Object.View>

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