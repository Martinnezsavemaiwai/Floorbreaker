// Scene stack (pushdown automaton, Game Programming Patterns "State"): Title or Play sit at the bottom,
// overlays like Pause push on top. Updates run from the top down and stop at the first scene with
// blocksUpdate; every scene still draws, bottom first, so Play stays visible under Pause.
// A scene is a plain object: { name, blocksUpdate?, enter?(), exit?(), update?(dt), draw?() }.
export function createSceneStack() {
  const stack = [];
  return {
    get top() { return stack[stack.length - 1]; },
    has: scene => stack.includes(scene),
    push(scene) { stack.push(scene); scene.enter?.(); },
    pop() { const scene = stack.pop(); scene?.exit?.(); return scene; },
    replace(scene) { while (stack.length) stack.pop().exit?.(); stack.push(scene); scene.enter?.(); },
    update(dt) {
      for (let i = stack.length - 1; i >= 0; i--) { stack[i].update?.(dt); if (stack[i].blocksUpdate) break; }
    },
    draw() { for (const scene of stack) scene.draw?.(); },
  };
}
