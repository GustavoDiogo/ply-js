import path from 'path';
import fs from 'fs';
import { readPlyFromLines } from '..';
import { measureAvatarFromPoints } from '../measurements';

function metersToFeetInches(m: number) {
  const feetDecimal = m * 3.28084;
  const feet = Math.floor(feetDecimal);
  const inches = Math.round((feetDecimal - feet) * 12);
  return { feet, inches, asString: `${feet}'${inches}"`, feetDecimal };
}

function kgToLbs(kg: number) { return Number((kg * 2.2046226218).toFixed(1)); }
function cmToIn(cm: number) { return Number((cm / 2.54).toFixed(2)); }

function findSample(defaultPath?: string) {
  if (defaultPath && fs.existsSync(defaultPath)) return defaultPath;
  const samplesRoot = path.join(process.cwd(), 'samples');
  const avatarsDir = path.join(samplesRoot, 'avatars');
  if (fs.existsSync(avatarsDir)) {
    const files = fs.readdirSync(avatarsDir).filter(f => f.toLowerCase().endsWith('.ply'));
    if (files.length) return path.join(avatarsDir, files[0]);
  }
  if (fs.existsSync(samplesRoot)) {
    const files = fs.readdirSync(samplesRoot).filter(f => f.toLowerCase().endsWith('.ply'));
    if (files.length) return path.join(samplesRoot, files[0]);
  }
  return defaultPath;
}

export { } from '../../examples/avatar-clothing-example.all';
