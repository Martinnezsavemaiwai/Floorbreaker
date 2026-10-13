// Slot icon per skill (and the basic attack): blade angle and glow colour. Every SKILLS id needs an entry.
export const ICON: Record<string, [number, string | null]> = {
  attack: [Math.PI / 4, null], sonicLeap: [-Math.PI / 4, '#5fc3ff'], horizontal: [Math.PI / 2, '#ffcf6a'], vorpal: [0, '#ff8a5a'],
  crescent: [-Math.PI / 8, '#9fe8ff'], riposte: [Math.PI / 3, '#fff1c4'], shade: [-Math.PI / 3, '#b9a3ff'],
};
