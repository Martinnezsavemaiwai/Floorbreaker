// Tiny event bus for things several systems react to (hit -> sound, death -> results screen...).
// Per-frame work and input don't go through here: hiding that control flow makes bugs hard to trace.
const handlers = {};
export const on = (name, fn) => { (handlers[name] ??= []).push(fn); };
export const emit = (name, data) => { for (const fn of handlers[name] ?? []) fn(data); };
