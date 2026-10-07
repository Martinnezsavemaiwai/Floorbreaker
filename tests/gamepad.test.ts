// Gamepad polling against a fake navigator.getGamepads (node has no Gamepad API).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pad, pollPad } from '../src/core/gamepad.ts';
import { moveVector, releaseAll } from '../src/core/input.ts';
import { PAD } from '../src/data/controls.ts';

let state: { axes: number[]; buttons: { pressed: boolean }[] };
const setPad = (axes: number[], pressed: number[] = []) => {
  state = { axes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })) };
};
beforeEach(() => {
  setPad([0, 0, 0, 0]);
  vi.stubGlobal('navigator', { getGamepads: () => [{ connected: true, ...state }] });
  releaseAll(); pollPad();
});

describe('gamepad', () => {
  it('ignores stick drift inside the deadzone, walks with the left stick and aims with the right', () => {
    setPad([0.1, -0.1, 0, 0]); pollPad();
    expect(moveVector().moving).toBe(false);
    setPad([0.8, 0, 0, -0.9]); pollPad();
    expect(moveVector()).toMatchObject({ x: 0.8, y: 0, moving: true });
    expect(pad.aiming).toBe(true);
    expect(Math.atan2(pad.aim.y, pad.aim.x)).toBeCloseTo(-Math.PI / 2);
  });

  it('reports a button once when it goes down, not every frame it is held', () => {
    setPad([0, 0, 0, 0], [PAD.A]);
    expect(pollPad()).toEqual([PAD.A]);
    expect(pollPad()).toEqual([]);
    setPad([0, 0, 0, 0]); pollPad();
    setPad([0, 0, 0, 0], [PAD.A]);
    expect(pollPad()).toEqual([PAD.A]);
  });

  it('a strong left-stick push doubles as d-pad presses for menus', () => {
    setPad([0, 0.9, 0, 0]);
    expect(pollPad()).toContain(PAD.DOWN);
  });

  it('a disconnected pad stops moving the player', () => {
    setPad([1, 0, 0, 0]); pollPad();
    vi.stubGlobal('navigator', { getGamepads: () => [null] });
    pollPad();
    expect(moveVector().moving).toBe(false);
    expect(pad.connected).toBe(false);
  });
});
