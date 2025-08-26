#!/usr/bin/env node
import * as path from 'path';
import * as fs from 'fs';

function loadLib() {
  const srcTs = path.resolve(__dirname, '..', 'src', 'index.ts');
  const srcJs = path.resolve(__dirname, '..', 'src', 'index.js');
  const dist = path.resolve(__dirname, '..', 'dist', 'index.js');
  try { if (fs.existsSync(srcTs)) return require(srcTs); } catch (e) {}
  try { if (fs.existsSync(srcJs)) return require(srcJs); } catch (e) {}
  try { if (fs.existsSync(dist)) return require(dist); } catch (e) {}
  return require('..');
}
const lib:any = loadLib();
const calibration = require('../src/calibration');

(async function(){
  const sample = path.resolve(__dirname, '..', 'samples', 'man.ply');
  const cal = calibration.loadCalibrationFile('scanner-A');
  console.log('loaded calibration:', cal);
  const ply = await lib.PlyData.read(sample);
  const vertex = ply.elements.find((e:any)=>e.name==='vertex');
  const face = ply.elements.find((e:any)=>e.name==='face');
  const pts = vertex.data.map((r:any)=> Array.isArray(r)? r.slice(0,3) : [r.x ?? r[0], r.y ?? r[1], r.z ?? r[2]] ).filter((p:any)=>p.every((n:any)=>typeof n==='number'));
  const faces = face ? face.data : null;
  // apply calibration directly: compute raw height and geometric volume then apply scale/density
  const heightMod = require('../src/measurements/height');
  const volMod = require('../src/measurements/volume');
  const rawH = heightMod.computeHeight(pts);
  const heightM = rawH > 100 ? rawH * 0.001 : rawH;
  const geomVol = faces && faces.length ? volMod.computeVolumeFromFaces(pts, faces) : volMod.computeVolumeVoxel(pts, faces, 0.01, 500000);
  console.log('raw height (m)=', heightM, 'raw geomVol=', geomVol);
  const appliedScale = cal?.scale ?? 1;
  const appliedDensity = cal?.densityKgPerM3 ?? 985;
  const heightCal = heightM * appliedScale;
  const volCal = geomVol * Math.pow(appliedScale, 3);
  const massCal = appliedDensity * volCal;
  console.log('calibrated: height(m)=', heightCal, 'volume(m^3)=', volCal, 'mass(kg)=', massCal);
})();
