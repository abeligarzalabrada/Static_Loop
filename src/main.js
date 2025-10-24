const Phaser = window.Phaser;

import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

const GAME_WIDTH = 640;
const GAME_HEIGHT = 360;

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#080b12',
    pixelArt: true,
    roundPixels: true,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
        },
    },
    dom: {
        createContainer: true,
    },
    scene: [BootScene, TitleScene, GameScene, UIScene],
};

window.addEventListener('load', () => {
    // Ensure Phaser has been loaded before booting the game loop.
    if (!Phaser) {
        console.error('Phaser failed to load. Check the CDN link.');
        return;
    }

    // eslint-disable-next-line no-new
    new Phaser.Game(config);
});
