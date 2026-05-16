import fs from 'fs';
import readline from 'readline';
import { predict } from '../src/logic/predict.js';

async function runValidation() {
  const fileStream = fs.createReadStream('../CO2_Brine_IFT Daniel Olagunju.xlsx.csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isHeader = true;
  let subCount = 0;
  let supCount = 0;
  let subRmse = 0;
  let supRmse = 0;
  let totalRmse = 0;
  let maxError = 0;
  
  let i = 0;

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    
    if (!line.trim()) continue;

    const parts = line.split(',');
    
    // Temperature,Pressure,Monovalent ion mol.,Bivalent ion mol.,Methane fraction,Nitrogen fraction,Density difference,Salt type,IFT,Reference
    const T = parseFloat(parts[0]) + 273.15; // K
    const P = parseFloat(parts[1]);
    const MCM = parseFloat(parts[2]);
    const BCM = parseFloat(parts[3]);
    const x_CH4 = parseFloat(parts[4]) / 100; // CSV has mol%, predict.js expects mol/mol
    const x_N2 = parseFloat(parts[5]) / 100;
    const drho = parseFloat(parts[6]);
    const brineType = parts[7];
    const trueIFT = parseFloat(parts[8]);

    const inputs = {
      P, T, drho, MCM, BCM, x_CH4, x_N2, brineType
    };

    const res = predict(inputs);
    
    const err = res.p50 - trueIFT;
    const sqErr = err * err;
    
    if (Math.abs(err) > Math.abs(maxError)) {
        maxError = err;
    }
    
    totalRmse += sqErr;
    if (res.regime === 'sub') {
      subRmse += sqErr;
      subCount++;
    } else {
      supRmse += sqErr;
      supCount++;
    }
    
    i++;
  }

  subRmse = Math.sqrt(subRmse / subCount);
  supRmse = Math.sqrt(supRmse / supCount);
  totalRmse = Math.sqrt(totalRmse / i);

  console.log(`Validation Results on ${i} records:`);
  console.log(`Subcritical RMSE (${subCount} records): ${subRmse.toFixed(12)}`);
  console.log(`Supercritical RMSE (${supCount} records): ${supRmse.toFixed(12)}`);
  console.log(`Overall RMSE: ${totalRmse.toFixed(12)}`);
  console.log(`Max Absolute Error: ${Math.abs(maxError).toFixed(12)}`);
}

runValidation().catch(console.error);
