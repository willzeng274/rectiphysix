import { writable } from "svelte/store";

export const physicsActive = writable<boolean>(false);
export const resetRotation = writable<boolean>(false);