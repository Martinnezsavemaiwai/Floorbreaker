// Turn the captures from e2e/press.capture.ts into itch.io page media (needs ffmpeg on PATH):
//   node scripts/press-video.mjs
// press/trailer.mp4     1920x1280, 30 fps, H.264, the game's title music under it (upload to YouTube, paste the link on itch)
// press/gameplay.gif    480x320, 10 fps, 3 s, Marisca's flood (itch shows animated GIFs among the screenshots, max 3 MB)
// press/cover-630x500.png  the itch cover image
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';

const ff = (...args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
const FPS = 30, frames = readdirSync('press/frames').filter(f => f.endsWith('.png')).length, secs = frames / FPS;

// the wordmark spans x 175-790 of the 960x640 title: a 630x500 window from (165, 10) holds it, the tower and the hero
ff('-i', 'press/cover-source.png', '-vf', 'crop=630:500:165:10', 'press/cover-630x500.png');

// 2x nearest-neighbour keeps the pixels square on YouTube; music fades in and out with the picture
ff('-framerate', String(FPS), '-i', 'press/frames/%05d.png', '-i', 'public/assets/music/title.mp3',
  '-vf', `scale=1920:1280:flags=neighbor,fade=in:0:15,fade=out:st=${(secs - 0.8).toFixed(2)}:d=0.8`,
  '-af', `afade=in:st=0:d=1,afade=out:st=${(secs - 1.5).toFixed(2)}:d=1.5`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
  '-t', secs.toFixed(2), '-movflags', '+faststart', 'press/trailer.mp4');

// Marisca rages and floods the room (clip frames 900-989); the camera barely moves there, so at half size with one
// shared palette the GIF stays under itch's 3 MB image cap (a scrolling fight came out at 4-5 MB)
const gif = `fps=10,scale=480:320:flags=neighbor,split[a][b];[a]palettegen=max_colors=48:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`;
ff('-start_number', '900', '-framerate', String(FPS), '-i', 'press/frames/%05d.png', '-frames:v', '90', '-filter_complex', gif, '-loop', '0', 'press/gameplay.gif');

for (const f of ['press/cover-630x500.png', 'press/trailer.mp4', 'press/gameplay.gif'])
  console.log(`${f}  ${(statSync(f).size / 1e6).toFixed(2)} MB`);
console.log(`trailer: ${secs.toFixed(1)} s from ${frames} frames`);
