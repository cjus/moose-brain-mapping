import { BrainwaveData } from './types.js';
import { Logger } from './logger.js';

// Constants for movement analysis
const ACCELERATION_THRESHOLD = 1.8;
const GYRO_THRESHOLD = 20.0;
const MOVEMENT_WARNING_COOLDOWN = 2000; // 2 seconds between warnings
const SMOOTHING_WINDOW = 5;

// Buffers for movement analysis
const accBuffer: number[] = [];
const gyroBuffer: number[] = [];
let lastMovementWarning = 0;

// Constants for relaxation analysis
const RELAXATION_WEIGHTS = {
    alpha: 0.4,  // Alpha is most important for relaxation
    theta: 0.3,  // Theta also indicates relaxation
    beta: -0.2,  // High beta indicates mental activity/stress
    gamma: -0.1  // High gamma can indicate active processing
};

export interface RelaxationState {
    isRelaxed: boolean;
    score: number;
}

export function checkExcessiveMovement(msg: BrainwaveData): void {
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

    accBuffer.push(accMagnitude);
    gyroBuffer.push(gyroMagnitude);

    if (accBuffer.length > SMOOTHING_WINDOW) accBuffer.shift();
    if (gyroBuffer.length > SMOOTHING_WINDOW) gyroBuffer.shift();

    const smoothedAcc = accBuffer.reduce((a, b) => a + b, 0) / accBuffer.length;
    const smoothedGyro = gyroBuffer.reduce((a, b) => a + b, 0) / gyroBuffer.length;

    const now = Date.now();
    if ((smoothedAcc > ACCELERATION_THRESHOLD || smoothedGyro > GYRO_THRESHOLD) && 
        (now - lastMovementWarning > MOVEMENT_WARNING_COOLDOWN)) {
        Logger.warn(`Excessive head movement detected (Acc: ${smoothedAcc.toFixed(2)}, Gyro: ${smoothedGyro.toFixed(2)})`);
        lastMovementWarning = now;
    }
}

export function analyzeRelaxationState(data: BrainwaveData): RelaxationState {
    const score = (
        (data.alpha * RELAXATION_WEIGHTS.alpha) +
        (data.theta * RELAXATION_WEIGHTS.theta) +
        (1 - data.beta) * RELAXATION_WEIGHTS.beta +
        (1 - data.gamma) * RELAXATION_WEIGHTS.gamma
    );

    const normalizedScore = Math.max(0, Math.min(1, score));
    
    return {
        isRelaxed: normalizedScore > 0.6,
        score: normalizedScore
    };
} 