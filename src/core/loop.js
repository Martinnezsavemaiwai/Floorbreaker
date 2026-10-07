// Fixed-timestep clock ("Fix Your Timestep", Gaffer On Games): real frame time is accumulated and the
// simulation consumes it in STEP-sized chunks, so gameplay timing is identical at 60, 120 or 144 Hz.
export const STEP = 1 / 60;

// advance(realSeconds) runs `step(STEP)` as many times as the accumulated time allows.
// - hitStop is spent in *real* time before any simulation (a sim-time counter would never tick down while frozen)
// - scale gives slow-mo / fast-forward for free
// - a long hitch (tab switch, breakpoint) is capped instead of snowballing into hundreds of steps
export function createClock(step, { maxFrame = 0.25, maxSteps = 8 } = {}) {
  const clock = {
    scale: 1, hitStop: 0, acc: 0,
    advance(real) {
      real = Math.min(real, maxFrame);
      if (clock.hitStop > 0) { const used = Math.min(clock.hitStop, real); clock.hitStop -= used; real -= used; }
      clock.acc += real * clock.scale;
      for (let n = 0; clock.acc >= STEP && clock.hitStop <= 0; n++) {
        if (n === maxSteps) { clock.acc = 0; break; }
        step(STEP); clock.acc -= STEP;
      }
    },
  };
  return clock;
}

// Drives a callback with real elapsed seconds from requestAnimationFrame. reset() drops the stale timestamp
// (e.g. after the tab was hidden) so the next frame doesn't see a huge gap.
export function runFrames(onFrame) {
  let last;
  requestAnimationFrame(function frame(now) {
    const real = last === undefined ? 0 : (now - last) / 1000;
    last = now; onFrame(real);
    requestAnimationFrame(frame);
  });
  return { reset() { last = undefined; } };
}
