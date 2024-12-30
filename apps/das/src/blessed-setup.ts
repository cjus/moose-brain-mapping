import blessed from 'blessed';
import contrib from 'blessed-contrib';

interface ScreenComponents {
    screen: any;
    grid: any;
    line: any;
    table: any;
    log: any;
}

export function createScreen(): ScreenComponents {
    const screen = blessed.screen();
    const grid = new contrib.grid({rows: 8, cols: 1, screen: screen});
    
    const line = grid.set(0, 0, 5, 1, contrib.line, {
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

    const table = grid.set(5, 0, 1, 1, contrib.table, {
        keys: true,
        interactive: false,
        label: 'Raw Data',
        columnSpacing: 2,
        columnWidth: [5, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]
    });

    const log = grid.set(6, 0, 2, 1, contrib.log, {
        fg: "green",
        selectedFg: "green",
        label: 'System Log',
        interactive: false
    });

    screen.on('resize', () => {
        line.emit('attach');
        table.emit('attach');
        log.emit('attach');
    });

    return { screen, grid, line, table, log };
} 