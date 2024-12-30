import dgram from 'dgram';
import * as oscmin from 'osc-min';
import { config } from 'dotenv';
import fs from 'fs';
import { BrainwaveData } from './types.js';
import { pcap } from './utils.js';
import { createScreen } from './blessed-setup.js';
import { Logger } from './logger.js';

config();

let msg: BrainwaveData = {
  bandOn: false,
  acc: {
    x: 0,
    y: 0,
    z: 0
  },
  gyro: {
    x: 0,
    y: 0,
    z: 0
  },
  alpha: 0,
  beta: 0,
  delta: 0,
  theta: 0,
  gamma: 0
};

// Initialize data arrays for the chart
const dataPoints = 50;
const alphaData = new Array(dataPoints).fill(0);
const betaData = new Array(dataPoints).fill(0);
const deltaData = new Array(dataPoints).fill(0);
const thetaData = new Array(dataPoints).fill(0);
const gammaData = new Array(dataPoints).fill(0);

// Create blessed screen and line chart
const { screen, grid, line, table, log } = createScreen();

// Add table headers
table.setData({
    headers: ['Band', 'AccX', 'AccY', 'AccZ', 'GyroX', 'GyroY', 'GyroZ', 'Alpha', 'Beta', 'Delta', 'Gamma', 'Theta'],
    data: [['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']]
});

// Add these constants near the top with other constants
const ACCELERATION_THRESHOLD = 1.8; // Higher than 1.0 to account for gravity + movement
const GYRO_THRESHOLD = 20.0; // Much higher since gyro readings are more sensitive
let lastMovementWarning = 0; // to prevent spam warnings
const MOVEMENT_WARNING_COOLDOWN = 2000; // 2 seconds between warnings

// Add smoothing buffers
const SMOOTHING_WINDOW = 5;
const accBuffer: number[] = [];
const gyroBuffer: number[] = [];

// Add this function to calculate movement magnitude
function checkExcessiveMovement(msg: BrainwaveData): void {
  // Calculate magnitude of acceleration and gyro vectors
  const accMagnitude = Math.sqrt(
    Math.pow(msg.acc.x, 2) + 
    Math.pow(msg.acc.y, 2) + 
    Math.pow(msg.acc.z, 2)
  );
  
  const gyroMagnitude = Math.sqrt(
    Math.pow(msg.gyro.x, 2) + 
    Math.pow(msg.gyro.y, 2) + 
    Math.pow(msg.gyro.z, 2)
  );

  // Add to buffers
  accBuffer.push(accMagnitude);
  gyroBuffer.push(gyroMagnitude);

  // Keep buffer size limited
  if (accBuffer.length > SMOOTHING_WINDOW) accBuffer.shift();
  if (gyroBuffer.length > SMOOTHING_WINDOW) gyroBuffer.shift();

  // Calculate smoothed values
  const smoothedAcc = accBuffer.reduce((a, b) => a + b, 0) / accBuffer.length;
  const smoothedGyro = gyroBuffer.reduce((a, b) => a + b, 0) / gyroBuffer.length;

  const now = Date.now();
  if ((smoothedAcc > ACCELERATION_THRESHOLD || smoothedGyro > GYRO_THRESHOLD) && 
      (now - lastMovementWarning > MOVEMENT_WARNING_COOLDOWN)) {
    Logger.warn(`Excessive head movement detected (Acc: ${smoothedAcc.toFixed(2)}, Gyro: ${smoothedGyro.toFixed(2)})`);
    lastMovementWarning = now;
  }
}

// Update chart function
function updateChart(msg: BrainwaveData): void {
  [alphaData, betaData, deltaData, thetaData, gammaData].forEach(arr => arr.shift());
  alphaData.push(msg.alpha);
  betaData.push(msg.beta);
  deltaData.push(msg.delta);
  thetaData.push(msg.theta);
  gammaData.push(msg.gamma);

  line.setData([
    {
      title: 'Alpha',
      x: [...Array(dataPoints).keys()],
      y: alphaData,
      style: {line: 'yellow'}
    },
    {
      title: 'Beta',
      x: [...Array(dataPoints).keys()],
      y: betaData,
      style: {line: 'red'}
    },
    {
      title: 'Delta',
      x: [...Array(dataPoints).keys()],
      y: deltaData,
      style: {line: 'green'}
    },
    {
      title: 'Theta',
      x: [...Array(dataPoints).keys()],
      y: thetaData,
      style: {line: 'blue'}
    },
    {
      title: 'Gamma',
      x: [...Array(dataPoints).keys()],
      y: gammaData,
      style: {line: 'magenta'}
    }
  ]);

  screen.render();
}

/**
 * @description dump object to file
 */
function writeFile(fileName: string, document: BrainwaveData): void {
    const s = fs.createWriteStream(fileName, {flags: 'a'});
    
    // Update table with current values
    table.setData({
        headers: ['Band', 'AccX', 'AccY', 'AccZ', 'GyroX', 'GyroY', 'GyroZ', 'Alpha', 'Beta', 'Delta', 'Gamma', 'Theta'],
        data: [[
            document.bandOn ? 'ON' : 'OFF',
            document.acc.x.toFixed(2),
            document.acc.y.toFixed(2),
            document.acc.z.toFixed(2),
            document.gyro.x.toFixed(2),
            document.gyro.y.toFixed(2),
            document.gyro.z.toFixed(2),
            document.alpha.toFixed(2),
            document.beta.toFixed(2),
            document.delta.toFixed(2),
            document.gamma.toFixed(2),
            document.theta.toFixed(2)
        ]]
    });

    // Write to file
    s.write(`${document.bandOn}\t${document.acc.x}\t${document.acc.y}\t${document.acc.y}\t${document.gyro.x}\t${document.gyro.y}\t${document.gyro.z}\t${document.alpha}\t${document.beta}\t${document.delta}\t${document.gamma}\t${document.theta}\r\n`);
    
    screen.render();
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const serviceName: string = "DAS";
  Logger.initialize(log);
  Logger.info(`Starting ${serviceName} service...`);

  const server = dgram.createSocket('udp4');
  server.on('message', (buffer, _rinfo) => {
    const message = oscmin.fromBuffer(buffer);
    const type = message.elements[0].address;
    const args = message.elements[0].args;

    if (type.includes('touching_forehead')) {
      const newBandState = args[0].value === 1;
      if (newBandState !== msg.bandOn) {
        if (newBandState) {
          Logger.info(`Band state changed from OFF to ON`);
        } else {
          Logger.warn(`Band state changed from ON to OFF`);
        }
      }
      msg.bandOn = newBandState;
    }
    if (type.includes('gyro')) {
      msg.gyro = {
        x: pcap(args[0].value),
        y: pcap(args[1].value),
        z: pcap(args[2].value)
      };
      checkExcessiveMovement(msg); // Add movement check after gyro update
    }
    if (type.includes('acc')) {
      msg.acc = {
        x: pcap(args[0].value),
        y: pcap(args[1].value),
        z: pcap(args[2].value)
      };
    }
    if (type.includes('alpha')) {
      msg.alpha = pcap(args[0].value);
    }
    if (type.includes('beta')) {
      msg.beta = pcap(args[0].value);
    }
    if (type.includes('delta')) {
      msg.delta = pcap(args[0].value);
    }
    if (type.includes('theta')) {
      msg.theta = pcap(args[0].value);
    }
    if (type.includes('gamma')) {
      msg.gamma = pcap(args[0].value);
    }
    writeFile('./brain_data.csv', msg);
    updateChart(msg);
  });

  server.on('listening', () => {
    let address = server.address();
    Logger.info(`server listening ${address.address}:${address.port}`);
  });

  server.on('error', (err) => {
    Logger.error(`Server error: ${err.message}`);
  });

  server.bind(Number(process.env.DAS_PORT) || 43134);
}

// Add this to handle exit
screen.key(['escape', 'q', 'C-c'], function(_ch: any, _key: any) {
  return process.exit(0);
});

main().catch((error: Error) => {
  Logger.error(error.message);
});
  
