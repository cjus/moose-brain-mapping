declare module 'blessed-contrib' {
    export function grid(options: {
        rows: number;
        cols: number;
        screen: any;
    }): {
        set: (row: number, col: number, rowSpan: number, colSpan: number, type: any, options: any) => any;
    };

    export const line: any;
} 