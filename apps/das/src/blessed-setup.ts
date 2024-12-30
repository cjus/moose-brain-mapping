import blessed from 'blessed';
import contrib from 'blessed-contrib';

export function createScreen() {
    const screen = blessed.screen();
    const grid = new contrib.grid({rows: 1, cols: 1, screen: screen});
    return { screen, grid };
} 