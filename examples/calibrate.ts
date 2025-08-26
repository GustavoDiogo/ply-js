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
  // Example labeled sample(s) — replace or extend with real labeled files
  const samples = [
    { file: path.resolve(__dirname, '..', 'samples', 'man.ply'), height: 1.68, mass: 75, machine: 'scanner-A' }
  ];
  const out = await calibration.calibrateSamples(samples, lib);
  console.log('calibration result:', out);
  const file = calibration.saveCalibrationFile('scanner-A', out['scanner-A']);
  console.log('saved calibration =>', file);
})();
