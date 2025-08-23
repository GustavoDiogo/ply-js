import { readPlyFromLines } from '../../index';
import fs from 'fs';
import path from 'path';
import { measureAvatarFromPoints } from '../../measurements';

describe('measureAvatarFromPoints by sex', () => {
  // samples are at the repository root `samples/avatars/...`
  const sample = path.join(__dirname, '..', '..', '..', 'samples', 'avatars', 'caio.ply');
  if (!fs.existsSync(sample)) {
    test.todo('sample ply not found at samples/avatars/caio.ply');
    return;
  }

  const raw = fs.readFileSync(sample, 'utf8');
  const ply = readPlyFromLines(raw.split(/\r?\n/));
  const map = Object.fromEntries(ply.elements.map((e:any) => [e.name, e] as const));
  const vertices = (map['vertex'] as any)?.data ?? [];
  const faces = (map['face'] as any)?.data ?? (map['polygon'] as any)?.data ?? [];
  const points: number[][] = vertices.map((v:any) => [v.x ?? v[0], v.y ?? v[1], v.z ?? v[2]]).filter((p:any) => p.every((n:any) => typeof n === 'number'));

  test('male vs female vs other produce sizes and mass adjustments', () => {
    const male = measureAvatarFromPoints(points, faces, 'US', { sex: 'male' });
    const female = measureAvatarFromPoints(points, faces, 'US', { sex: 'female' });
    const other = measureAvatarFromPoints(points, faces, 'US', { sex: 'other' });

    expect(male).toHaveProperty('massKg');
    expect(female).toHaveProperty('massKg');
    expect(other).toHaveProperty('massKg');

    // mass should differ slightly if sex affects estimate
    expect(male.massKg).not.toBe(female.massKg);
    // other should be a positive number
    expect(other.massKg).toBeGreaterThan(0);

    // sizes should be present
    expect(male.sizes).toBeDefined();
    expect(female.sizes).toBeDefined();
    expect(other.sizes).toBeDefined();
  });
});
