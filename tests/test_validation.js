import fs from 'fs';
import readline from 'readline';
import { predict } from '../src/logic/predict.js';

/**
 * Validation runner — evaluates predict() against curated test_data.csv.
 * CSV columns: T(°C), P(MPa), MCM, BCM, x_CH4(mol%), x_N2(mol%), drho, salt_type, IFT, Reference
 */
async function runValidation() {
  const fileStream = fs.createReadStream(new URL('./test_data.csv', import.meta.url));
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isHeader = true;
  let subCount = 0, supCount = 0;
  let subRmse = 0, supRmse = 0;
  let totalRmse = 0, maxError = 0;
  let i = 0;

  // Per-brine breakdown
  const brineStats = {};
  const impurityStats = { pure: { n: 0, rmse: 0 }, ch4: { n: 0, rmse: 0 }, n2: { n: 0, rmse: 0 }, both: { n: 0, rmse: 0 } };

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    if (!line.trim()) continue;

    const parts = line.split(',');

    const T = parseFloat(parts[0]) + 273.15; // °C → K
    const P = parseFloat(parts[1]);
    const MCM = parseFloat(parts[2]);
    const BCM = parseFloat(parts[3]);
    const x_CH4 = parseFloat(parts[4]) / 100; // mol% → mol/mol
    const x_N2 = parseFloat(parts[5]) / 100;
    const drho = parseFloat(parts[6]);
    const brineType = parts[7];
    const trueIFT = parseFloat(parts[8]);

    const inputs = { P, T, drho, MCM, BCM, x_CH4, x_N2, brineType };
    const res = predict(inputs);

    const err = res.p50 - trueIFT;
    const sqErr = err * err;

    if (Math.abs(err) > Math.abs(maxError)) maxError = err;

    totalRmse += sqErr;
    if (res.regime === 'sub') { subRmse += sqErr; subCount++; }
    else { supRmse += sqErr; supCount++; }

    // Per-brine
    if (!brineStats[brineType]) brineStats[brineType] = { n: 0, rmse: 0 };
    brineStats[brineType].rmse += sqErr;
    brineStats[brineType].n++;

    // Per-impurity
    const hasCH4 = x_CH4 > 0;
    const hasN2 = x_N2 > 0;
    const impKey = hasCH4 && hasN2 ? 'both' : hasCH4 ? 'ch4' : hasN2 ? 'n2' : 'pure';
    impurityStats[impKey].rmse += sqErr;
    impurityStats[impKey].n++;

    i++;
  }

  subRmse = Math.sqrt(subRmse / subCount);
  supRmse = Math.sqrt(supRmse / supCount);
  totalRmse = Math.sqrt(totalRmse / i);

  console.log(`\nValidation Results on ${i} records (curated test_data.csv):`);
  console.log('─'.repeat(60));
  console.log(`Subcritical RMSE    (${subCount} records): ${subRmse.toFixed(4)} mN/m`);
  console.log(`Supercritical RMSE  (${supCount} records): ${supRmse.toFixed(4)} mN/m`);
  console.log(`Overall RMSE        (${i} records): ${totalRmse.toFixed(4)} mN/m`);
  console.log(`Max Absolute Error: ${Math.abs(maxError).toFixed(4)} mN/m\n`);

  console.log('Per-brine breakdown:');
  console.log('─'.repeat(60));
  for (const [brine, s] of Object.entries(brineStats).sort((a, b) => b[1].n - a[1].n)) {
    const rmse = Math.sqrt(s.rmse / s.n);
    console.log(`  ${brine.padEnd(15)} n=${String(s.n).padStart(4)}  RMSE=${rmse.toFixed(4)}`);
  }

  console.log('\nPer-impurity breakdown:');
  console.log('─'.repeat(60));
  for (const [key, s] of Object.entries(impurityStats).sort((a, b) => b[1].n - a[1].n)) {
    if (s.n === 0) continue;
    const rmse = Math.sqrt(s.rmse / s.n);
    console.log(`  ${key.padEnd(10)} n=${String(s.n).padStart(4)}  RMSE=${rmse.toFixed(4)}`);
  }
}

runValidation().catch(console.error);
