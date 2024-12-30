export class Logger {
    private static log: any;

    public static initialize(logComponent: any) {
        this.log = logComponent;
    }

    public static info(message: string) {
        const timestamp = new Date().toISOString();
        this.log.log(`[${timestamp}] INFO: ${message}`);
    }

    public static error(message: string) {
        const timestamp = new Date().toISOString();
        this.log.log(`[${timestamp}] ERROR: ${message}`);
    }

    public static warn(message: string) {
        const timestamp = new Date().toISOString();
        this.log.log(`[${timestamp}] WARN: ${message}`);
    }
} 