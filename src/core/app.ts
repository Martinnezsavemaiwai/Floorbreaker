// The one scene stack and fixed-step clock the whole game runs on.
import { createSceneStack } from './scenes.ts';
import { createClock } from './loop.ts';
import { G } from '../world/state.ts';

export const scenes = createSceneStack();
export const clock = createClock(dt => { G.time += dt; scenes.update(dt); });
