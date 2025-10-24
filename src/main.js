const Phaser = window.Phaser;

import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

function resolveResolution() {
    const dpr = window.devicePixelRatio || 1;
    return Math.min(3, Math.max(1, Math.round(dpr)));
}

function buildConfig(parent) {
    if (!Phaser) {
        throw new Error('Phaser failed to load. Check the CDN link.');
    }

    return {
        type: Phaser.AUTO,
        parent,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: '#080b12',
        pixelArt: true,
        roundPixels: true,
        resolution: resolveResolution(),
        physics: {
            default: 'arcade',
            arcade: {
                debug: false,
            },
        },
        dom: {
            createContainer: true,
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            parent,
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            expandParent: true,
        },
        scene: [BootScene, TitleScene, GameScene, UIScene],
    };
}

export function createGame(parentElement) {
    const parent = parentElement ?? 'game-container';
    const config = buildConfig(parent);
    return new Phaser.Game(config);
}

export function destroyGame(gameInstance) {
    if (gameInstance && typeof gameInstance.destroy === 'function') {
        gameInstance.destroy(true);
    }
}
