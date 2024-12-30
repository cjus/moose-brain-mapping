export class Logger {
    private static log: any;

    public static initialize(logComponent: any) {
        this.log = logComponent;
    }

    public static info(message: string) {
        const timestamp = new Date().toISOString();
        this.log.log(`\x1b[32m[${timestamp}] INFO: ${message}\x1b[0m`);
    }

    public static error(message: string) {
        const timestamp = new Date().toISOString();
        this.log.log(`\x1b[31m[${timestamp}] ERROR: ${message}\x1b[0m`);
    }

    public static warn(message: string) {
        const timestamp = new Date().toISOString();
        this.log.log(`\x1b[33m[${timestamp}] WARN: ${message}\x1b[0m`);
    }
} 