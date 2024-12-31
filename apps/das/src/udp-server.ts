import dgram from 'dgram';
import * as oscmin from 'osc-min';
import { BrainwaveData } from './types.js';
import { Logger } from './logger.js';
import { pcap } from './utils.js';

export class UDPServer {
    private server!: dgram.Socket;
    private msg: BrainwaveData;
    private requestCount = 0;
    private lastRequestLog = Date.now();
    private readonly SAMPLE_LOG_INTERVAL = 5000; // 5 seconds

    constructor(private onDataUpdate: (data: BrainwaveData) => void) {
        this.msg = {
            sessionId: "",
            timestamp: new Date(),
            bandOn: false,
            acc: { x: 0, y: 0, z: 0 },
            gyro: { x: 0, y: 0, z: 0 },
            alpha: 0,
            beta: 0,
            delta: 0,
            theta: 0,
            gamma: 0
        };
    }

    start(port: number): void {
        this.server = dgram.createSocket('udp4');

        this.server.on('message', (buffer, _rinfo) => {
            this.handleMessage(buffer);
        });

        this.server.on('listening', () => {
            const address = this.server.address();
            Logger.info(`server listening ${address.address}:${address.port}`);
        });

        this.server.on('error', (err) => {
            Logger.error(`Server error: ${err.message}`);
        });

        this.server.bind(port);
    }

    private handleMessage(buffer: Buffer): void {
        this.requestCount++;
        
        const now = Date.now();
        if (now - this.lastRequestLog >= this.SAMPLE_LOG_INTERVAL) {
            const requestsPerSecond = this.requestCount / (this.SAMPLE_LOG_INTERVAL / 1000);
            Logger.info(`Sample rate: ${requestsPerSecond.toFixed(2)} samples/second`);
            this.requestCount = 0;
            this.lastRequestLog = now;
        }

        const message = oscmin.fromBuffer(buffer);
        const type = message.elements[0].address;
        const args = message.elements[0].args;
        
        this.updateMessageData(type, args);
        this.msg.timestamp = new Date();
        this.onDataUpdate(this.msg);
    }

    private updateMessageData(type: string, args: any[]): void {
        if (type.includes('touching_forehead')) {
            const newBandState = args[0].value === 1;
            if (newBandState !== this.msg.bandOn) {
                if (newBandState) {
                    Logger.info('Band state changed from OFF to ON');
                } else {
                    Logger.warn('Band state changed from ON to OFF');
                }
            }
            this.msg.bandOn = newBandState;
        }
        if (type.includes('gyro')) {
            this.msg.gyro = {
                x: pcap(args[0].value),
                y: pcap(args[1].value),
                z: pcap(args[2].value)
            };
        }
        if (type.includes('acc')) {
            this.msg.acc = {
                x: pcap(args[0].value),
                y: pcap(args[1].value),
                z: pcap(args[2].value)
            };
        }
        if (type.includes('alpha')) this.msg.alpha = pcap(args[0].value);
        if (type.includes('beta')) this.msg.beta = pcap(args[0].value);
        if (type.includes('delta')) this.msg.delta = pcap(args[0].value);
        if (type.includes('theta')) this.msg.theta = pcap(args[0].value);
        if (type.includes('gamma')) this.msg.gamma = pcap(args[0].value);
    }

    close(): void {
        if (this.server) {
            this.server.close();
        }
    }
} 