import { Key } from "@514labs/moose-lib";

export interface Brain {
    timestamp: Key<Date>;
    bandOn: boolean;
    acc: {
        x: number;
        y: number;
        z: number;
    };
    gyro: {
        x: number;
        y: number;
        z: number;
    };
    alpha: number;
    beta: number;
    delta: number;
    theta: number;
    gamma: number;
}
