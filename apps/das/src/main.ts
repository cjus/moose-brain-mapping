import dgram from 'dgram';
import * as oscmin from 'osc-min';
import { config } from 'dotenv';
import fs from 'fs';
import { BrainwaveData } from './types.js';
import { pcap } from './utils.js';
import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { createScreen } from './blessed-setup.js';

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
const { screen, grid } = createScreen();
const line = grid.set(0, 0, 1, 1, contrib.line, {
  style: {
    line: "yellow",
    text: "green",
    baseline: "black"
  },
  xLabelPadding: 3,
  xPadding: 5,
  showLegend: true,
  wholeNumbersOnly: false,
  label: 'DAS - Brainwave Activity Monitor'
});

// Update chart function
function updateChart(msg: BrainwaveData): void {
  [alphaData, betaData, deltaData, thetaData, gammaData].forEach(arr => arr.shift());
  alphaData.push(msg.alpha);
  betaData.push(msg.beta);
  deltaData.push(msg.delta);
  thetaData.push(msg.theta);
  gammaData.push(msg.gamma);

  // Update chart data
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
  console.log(`${document.bandOn}\t${document.acc.x}\t${document.acc.y}\t${document.acc.y}\t${document.gyro.x}\t${document.gyro.y}\t${document.gyro.z}\t${document.alpha}\t${document.beta}\t${document.delta}\t${document.gamma}\t${document.theta}`);
  s.write(`${document.bandOn}\t${document.acc.x}\t${document.acc.y}\t${document.acc.y}\t${document.gyro.x}\t${document.gyro.y}\t${document.gyro.z}\t${document.alpha}\t${document.beta}\t${document.delta}\t${document.gamma}\t${document.theta}`);
  s.write('\r\n');
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const serviceName: string = "DAS";
  console.log(`Starting ${serviceName} service...`);

  const server = dgram.createSocket('udp4');
  server.on('message', (buffer, _rinfo) => {
    const message = oscmin.fromBuffer(buffer);
    const type = message.elements[0].address;
    const args = message.elements[0].args;

    if (type.includes('touching_forehead')) {
      msg.bandOn = args[0].value === 1 ? true : false;
    }
    if (type.includes('gyro')) {
      msg.gyro = {
        x: pcap(args[0].value),
        y: pcap(args[1].value),
        z: pcap(args[2].value)
      };
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
    // writeFile('./brain_data.csv', msg);
    updateChart(msg);
  });

  server.on('listening', () => {
    let address = server.address();
    console.log(`server listening ${address.address}:${address.port}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });

  server.bind(Number(process.env.DAS_PORT) || 43134);
}

// Add this to handle exit
screen.key(['escape', 'q', 'C-c'], function(_ch: any, _key: any) {
  return process.exit(0);
});

main().catch((error: Error) => {
  console.error(error);
});
  
