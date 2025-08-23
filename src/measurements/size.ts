import { computeHeight } from './height';
import { computeAABB } from './aabb';
import { computeCentroid } from './centroid';
import { computeCrossSectionCircumference } from './crossSection';
import { computeVolumeFromFaces, estimateMassFromVolume } from './volume';

export type SizingSystem = 'US' | 'BR' | 'EURO';

function detectAndNormalizeUnits(height: number) {
  // Heuristic: if height > 3 assume height is in mm or cm. Convert to meters.
  // If height > 10 -> mm, if height > 3 and <= 10 -> cm
  if (!Number.isFinite(height) || height <= 0) return { heightM: 0, units: 'meters' };
  if (height > 10) return { heightM: height / 1000, units: 'millimeters' };
  if (height > 3) return { heightM: height / 100, units: 'centimeters' };
  return { heightM: height, units: 'meters' };
}

function cm(v: number) { return v * 100; }

function mapChestToShirt(chestCm: number, system: SizingSystem) {
  // approximate thresholds in cm
  const labelsUS = ['XS','S','M','L','XL','XXL'];
  const thresholds = [80, 92, 100, 108, 116];
  let idx = thresholds.findIndex(t => chestCm <= t);
  if (idx === -1) idx = labelsUS.length - 1; // largest
  const us = labelsUS[Math.max(0, idx)];
  if (system === 'US') return { label: us, chestCm };
  if (system === 'BR') {
    // BR: P, M, G, GG roughly map
    const brMap: Record<string,string> = { 'XS':'P','S':'P','M':'M','L':'G','XL':'GG','XXL':'EG' };
    return { label: brMap[us] ?? us, chestCm };
  }
  // EURO numeric sizes approximate
  const euroMap: Record<string,string> = { 'XS':'44','S':'46','M':'48','L':'50','XL':'52','XXL':'54' };
  return { label: euroMap[us] ?? us, chestCm };
}

function mapWaistToPants(waistCm: number, system: SizingSystem) {
  const waistIn = waistCm / 2.54;
  // round to nearest even integer commonly used for US sizes
  const usNum = Math.round(waistIn / 2) * 2;
  if (system === 'US') return { label: `${usNum}`, waistCm, waistIn };
  if (system === 'BR') {
    // Map BR pants to an EU-like numeric sizing for better alignment with BR market
    // Use the same heuristic as EURO: eu = usNum + 16
    const brNumeric = usNum + 16;
    return { label: `${brNumeric}`, waistCm, waistIn };
  }
  // EURO trousers size roughly waist_in + 16
  const euro = usNum + 16;
  return { label: `${euro}`, waistCm, waistIn };
}

function mapFootLengthToShoe(footCm: number, system: SizingSystem) {
  const footIn = footCm * 0.393701;
  // approximate US men's size formula: size = foot_in * 3 - 22
  const usSize = Math.round(footIn * 3 - 22);
  if (system === 'US') return { label: `${usSize}`, size: usSize, footCm };
  if (system === 'BR') {
    // Better BR approximation: convert to EURO then to BR numeric (heuristic)
    const euro = usSize + 33;
    const brSize = Math.max(34, euro - 2); // ensure plausible adult size
    return { label: `${brSize}`, size: brSize, footCm };
  }
  // EURO size roughly US + 33
  const euro = usSize + 33;
  return { label: `${euro}`, size: euro, footCm };
}

export interface AvatarMeasurement {
  objectType: 'avatar';
  units: string;
  heightMeters: number;
  heightCentimeters: number;
  volumeM3: number;
  massKg: number;
  aabb: { min:number[], max:number[], size:number[] } | null;
  centroid: number[] | null;
  sizes: {
    system: SizingSystem;
    shirt: { label:string, chestCm:number };
    pants: { label:string, waistCm:number, waistIn:number };
    shoe: { label:string, size:number, footCm:number };
  };
}

export function measureAvatarFromPoints(points: number[][], faceRecords: any[] | undefined, system: SizingSystem = 'US', options?: { sex?: 'male'|'female'|'other' }): AvatarMeasurement {
  const sex = options?.sex ?? 'other';

  // compute raw height from the input point cloud (units unknown)
  const rawHeight = computeHeight(points);
  const detected = detectAndNormalizeUnits(rawHeight);
  const heightM = detected.heightM;
  const units = detected.units;

  // If rawHeight was detected in different units (mm or cm), scale all points to meters
  let scaledPoints = points;
  if (Number.isFinite(rawHeight) && rawHeight > 0) {
    const scale = heightM / rawHeight; // e.g. rawHeight in mm -> scale = meters/mm
    if (scale !== 1) {
      scaledPoints = points.map(p => [p[0] * scale, p[1] * scale, p[2] * scale]);
    }
  }

  const aabb = computeAABB(scaledPoints);
  const centroid = computeCentroid(scaledPoints);

  // volume: prefer face-based computation (use scaledPoints)
  let volume = 0;
  if (faceRecords && faceRecords.length) {
    try { volume = computeVolumeFromFaces(scaledPoints, faceRecords); }
    catch (e) { volume = 0; }
  }
  // fallback: use AABB volume * fill factor
  if (volume === 0 && aabb) {
    const s = aabb.size;
    const aabbVol = s[0] * s[1] * s[2];
    volume = aabbVol * 0.6; // heuristic human fill factor
  }

  // sex-based adjustment factors
  const MASS_FACTOR: Record<string, number> = { male: 1.06, female: 0.94, other: 1.0 };
  const CHEST_MULT: Record<string, number> = { male: 1.02, female: 0.98, other: 1.0 };
  const WAIST_MULT: Record<string, number> = { male: 1.01, female: 0.99, other: 1.0 };

  const massKgBase = estimateMassFromVolume(volume);
  const massKg = massKgBase * (MASS_FACTOR[sex] ?? 1.0);

  // circumferences: chest ~ 55% of height from bottom, waist ~ 45%, hip ~ 40% (heuristics)
  const minY = (aabb && aabb.min) ? aabb.min[1] : 0;
  const h = (aabb && aabb.size) ? aabb.size[1] : heightM;
  const chestY = minY + 0.55 * h;
  const waistY = minY + 0.45 * h;
  const chestCirc = computeCrossSectionCircumference(scaledPoints, chestY);
  const waistCirc = computeCrossSectionCircumference(scaledPoints, waistY);

  // apply sex multipliers to circumferences
  const chestCircAdj = chestCirc * (CHEST_MULT[sex] ?? 1.0);
  const waistCircAdj = waistCirc * (WAIST_MULT[sex] ?? 1.0);

  // shoe foot length estimate: assume foot length ~ 15% of height
  const footLenCm = cm(heightM * 0.15);

  const shirt = mapChestToShirt(cm(chestCircAdj), system);
  const pants = mapWaistToPants(cm(waistCircAdj), system);
  const shoe = mapFootLengthToShoe(footLenCm, system);

  return {
    objectType: 'avatar',
    units,
    heightMeters: Number(heightM.toFixed(4)),
    heightCentimeters: Number((heightM * 100).toFixed(1)),
    volumeM3: Number(volume),
    massKg: Number(Number(massKg).toFixed(2)),
    aabb,
    centroid,
    sizes: { system, shirt, pants, shoe }
  };
}
