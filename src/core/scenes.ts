// Scene stack (pushdown automaton, Game Programming Patterns "State"): Title or Play sit at the bottom,
// overlays like Pause push on top. Updates run from the top down and stop at the first scene with
// blocksUpdate; every scene still draws, bottom first, so Play stays visible under Pause.
export interface Scene {
  name: string; blocksUpdate?: boolean;
  enter?(): void; exit?(): void; update?(dt: number): void; draw?(): void;
}
export function createSceneStack() {
  const stack: Scene[] = [];
  return {
    get top() { return stack[stack.length - 1]; },
    has: (scene: Scene) => stack.includes(scene),
    push(scene: Scene) { stack.push(scene); scene.enter?.(); },
    pop() { const scene = stack.pop(); scene?.exit?.(); return scene; },
    replace(scene: Scene) { while (stack.length) stack.pop().exit?.(); stack.push(scene); scene.enter?.(); },
    update(dt: number) {
      for (let i = stack.length - 1; i >= 0; i--) { stack[i].update?.(dt); if (stack[i].blocksUpdate) break; }
    },
    draw() { for (const scene of stack) scene.draw?.(); },
  };
}
