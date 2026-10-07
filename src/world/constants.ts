// Fixed geometry shared by every floor (canvas size must match <canvas width/height> in index.html)
export const W = 960, H = 640;
export const WORLD = { w: 2000, h: 1200 }, TOWN_X = 400, ROOM_X = 1500;
export const ROOM = { x0: ROOM_X + 40, x1: WORLD.w, y0: 0, y1: WORLD.h };
export const GATE = [{ x: ROOM_X, y: 0, w: 40, h: 540 }, { x: ROOM_X, y: 660, w: 40, h: 540 }];
export const DOOR = { x: ROOM_X, y: 540, w: 40, h: 120 };
export const TORCHES = [[1570, 80], [1570, 1120], [1960, 80], [1960, 1120], [1570, 470], [1570, 730]];
