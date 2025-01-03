import fs from 'fs';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { BrainwaveData } from './types.js';
import { createScreen } from './blessed-setup.js';
import { Logger } from './logger.js';
import { checkExcessiveMovement, analyzeRelaxationState } from './brainwave-analyzer.js';
import { DisplayManager } from './display-manager.js';
import { UDPServer } from './udp-server.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

config({ path: '../../.env.local' });

interface Args {
    sessionId: string;
}

const argv = yargs(hideBin(process.argv))
    .option('sessionId', {
        alias: 's',
        description: 'Session identifier',
        type: 'string',
        default: () => Math.floor(Date.now() / 1000).toString(),
        demandOption: false
    })
    .help()
    .parse() as Args;

// Create blessed screen and charts
const { screen, line, table, log } = createScreen();

Logger.initialize(log);

let lastRelaxationState = false;
let isFirstReading = true;

let server: UDPServer;
const displayManager = new DisplayManager(screen, line, table);

/**
 * @description dump object to file
 */
function writeFile(fileName: string, document: BrainwaveData): void {
    const sessionFileName = `./brain_data_${argv.sessionId}.csv`;
    const s = fs.createWriteStream(sessionFileName, {flags: 'a'});
    
    document.sessionId = `${argv.sessionId}`;
    if (!process.env.MOOSE_INGEST_URL) {
        throw new Error('MOOSE_INGEST_URL is not defined in environment variables');
    }
    fetch(process.env.MOOSE_INGEST_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(document)
    }).catch(error => {
        Logger.error(`Failed to send data to server: ${error.message}`);
    });
    
    // Check relaxation state
    const relaxationState = analyzeRelaxationState(document);
    
    // Debug logging
    // Logger.info(`Debug - Current: ${relaxationState.isRelaxed}, Last: ${lastRelaxationState}, Score: ${relaxationState.score.toFixed(2)}`);
    
    if (document.bandOn && (isFirstReading || relaxationState.isRelaxed !== lastRelaxationState)) {
        if (relaxationState.isRelaxed) {
            Logger.info(`State changed to relaxed (score: ${relaxationState.score.toFixed(2)})`);
        } else {
            Logger.warn(`State changed to active (score: ${relaxationState.score.toFixed(2)})`);
        }
        lastRelaxationState = relaxationState.isRelaxed;
        isFirstReading = false;
    }
    
    displayManager.updateTable(document);

    s.write(`${document.bandOn}\t${document.acc.x}\t${document.acc.y}\t${document.acc.z}\t${document.gyro.x}\t${document.gyro.y}\t${document.gyro.z}\t${document.alpha}\t${document.beta}\t${document.delta}\t${document.gamma}\t${document.theta}\r\n`);    
    screen.render();
}

/**
 * Main function
 */
async function main(): Promise<void> {
    const serviceName: string = "DAS";
    Logger.initialize(log);
    Logger.info(`Starting ${serviceName} service...`);
    Logger.info(`Session ID: ${argv.sessionId}`);

    const displayManager = new DisplayManager(screen, line, table);
    
    server = new UDPServer((data) => {
        writeFile('./brain_data.csv', data);
        displayManager.updateChart(data);
        displayManager.updateTable(data);
        checkExcessiveMovement(data);
    });

    server.start(Number(process.env.DAS_PORT) || 43134);
}

function cleanup() {
    server.close();
    screen.destroy();
    process.stdout.write('\x1b[2J\x1b[0f');
    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

screen.key(['escape', 'q', 'C-c'], function(_ch: any, _key: any) {
    cleanup();
});

main().catch((error: Error) => {
  Logger.error(error.message);
});
  
