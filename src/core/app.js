// The one scene stack and fixed-step clock the whole game runs on.
import { createSceneStack } from './scenes.js';
import { createClock } from './loop.js';
import { G } from '../world/state.js';

export const scenes = createSceneStack();
export const clock = createClock(dt => { G.time += dt; scenes.update(dt); });
