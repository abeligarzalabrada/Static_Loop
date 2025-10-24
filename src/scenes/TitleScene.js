const Phaser = window.Phaser;

import StoryManager from '../system/StoryManager.js';

export default class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
        this.busy = false;
        this.statusText = null;
    }

    create() {
        const { width, height } = this.scale;
        const centerX = width / 2;

        const title = this.add.text(centerX, height * 0.24, 'STATIC LOOP', {
            fontFamily: 'monospace',
            fontSize: 48,
            color: '#e2e6ff',
        });
        title.setOrigin(0.5, 0.5);

        const baseHistory = StoryManager.getBaseStory();
        const summary = baseHistory?.baseHistory?.summary ?? 'A dungeon that rearranges itself every loop.';
        const summaryText = this.add.text(centerX, height * 0.42, summary, {
            fontFamily: 'monospace',
            fontSize: 14,
            color: '#abb5ff',
            align: 'center',
            wordWrap: { width: width * 0.8 },
        });
        summaryText.setOrigin(0.5, 0.5);

        const startButton = this.add.text(centerX, height * 0.6, '[ Start New Run ]', {
            fontFamily: 'monospace',
            fontSize: 20,
            color: '#ffffff',
        });
        startButton.setOrigin(0.5, 0.5);
        startButton.setInteractive({ useHandCursor: true });
        startButton.on('pointerup', () => this.beginNewRun());

        this.input.keyboard.once('keydown-SPACE', () => this.beginNewRun());
        this.input.keyboard.once('keydown-ENTER', () => this.beginNewRun());

        const continueButton = this.add.text(centerX, height * 0.68, '[ Continue Last Run ]', {
            fontFamily: 'monospace',
            fontSize: 16,
            color: StoryManager.hasSavedRun() ? '#89d9ff' : '#39425c',
        });
        continueButton.setOrigin(0.5, 0.5);
        continueButton.setInteractive({ useHandCursor: StoryManager.hasSavedRun() });
        continueButton.on('pointerup', () => {
            if (!StoryManager.hasSavedRun() || this.busy) {
                return;
            }

            const savedRun = StoryManager.loadSavedRun();
            if (savedRun) {
                StoryManager.setCurrentRun(savedRun);
                this.scene.start('GameScene', { runData: savedRun, fromSave: true });
            } else {
                this.showStatus('Save slot corrupted. Starting new run.');
            }
        });

        this.statusText = this.add.text(centerX, height * 0.8, '', {
            fontFamily: 'monospace',
            fontSize: 14,
            color: '#f6246e',
        });
        this.statusText.setOrigin(0.5, 0.5);

        this.add.text(centerX, height * 0.92, 'Press SPACE/ENTER or click to begin a new loop.', {
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#5f6a92',
        }).setOrigin(0.5, 0.5);
    }

    async beginNewRun() {
        if (this.busy) {
            return;
        }

        this.busy = true;
        this.showStatus('Mutating story draft…');

        try {
            const runData = await StoryManager.buildRun();
            this.showStatus('');
            this.scene.start('GameScene', { runData, fromSave: false });
        } catch (error) {
            console.error('[TitleScene] Failed to mutate story', error);
            this.showStatus('Mutation failed. Loading base loop…');
            const fallback = StoryManager.getBaseStory();
            StoryManager.setCurrentRun(fallback);
            this.scene.start('GameScene', { runData: fallback, fromSave: false });
        }
    }

    showStatus(message) {
        if (!this.statusText) {
            return;
        }

        this.statusText.setText(message ?? '');
    }
}
