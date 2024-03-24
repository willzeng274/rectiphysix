import { writable } from "svelte/store";

type XYZ = {
    x: number,
    y: number,
    z: number
};

// type XYZW = {
//     x: number,
//     y: number,
//     z: number,
//     w: number
// };

export interface KeyedItem {
    // world
    position: XYZ,
    rotation: [number, number, number, number],
    // physics
    additionalMass: number,
    resetOnGround: boolean,
    initialVelocity: [number, number, number],
    initialForce: [number, number, number],
    initialImpulse: [number, number, number],
    timer: number,
    // material
    geometryType: "Box" | "Capsule" | "Sphere" | "Cylinder",
    geometryArgs: {
        Box: [number, number, number],
		Capsule: [number, number, number, number],
		Sphere: [number, number, number],
		Cylinder: [number, number, number, number]
    },
    color: string
}

export type Project = {
    // *
    gravity: XYZ,
    position: number
} & {
    [key: string]: KeyedItem
}

export const physicsActive = writable<boolean>(false);
export const resetRotation = writable<boolean>(false);
export const globalState = writable<{
    [project: string]: Project
} | null>(null);
export const savedState = writable<{
    [project: string]: Project
} | null>(null);