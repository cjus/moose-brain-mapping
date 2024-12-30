import dgram from 'dgram';
import * as oscmin from 'osc-min';
import { config } from 'dotenv';
import fs from 'fs';
import { BrainwaveData } from './types.js';
import { pcap } from './utils.js';

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

/**
 * @description dump object to file
 */
function writeFile(fileName: string, document: BrainwaveData): void {
  const s = fs.createWriteStream(fileName, {flags: 'a'});
  console.log(`${document.bandOn}\t${document.acc.x}\t${document.acc.y}\t${document.acc.y}\t${document.gyro.x}\t${document.gyro.y}\t${document.gyro.z}\t${document.alpha}\t${document.beta}\t${document.delta}\t${document.gamma}\t${document.theta}`);
  // s.write(`${document.bandOn}\t${document.acc.x}\t${document.acc.y}\t${document.acc.y}\t${document.gyro.x}\t${document.gyro.y}\t${document.gyro.z}\t${document.alpha}\t${document.beta}\t${document.delta}\t${document.gamma}\t${document.theta}`);
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
    console.log('Raw buffer received:', buffer);
    const message = oscmin.fromBuffer(buffer);
    console.log('Parsed OSC message:', message);
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
    writeFile('./brain_data.csv', msg);
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

main().catch((error: Error) => {
  console.error(error);
});
  
