const Phaser = window.Phaser;

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
        this.inventory = null;
        this.crafting = null;
        this.gameScene = null;
        this.healthIcons = [];
        this.inventoryText = null;
        this.keyText = null;
        this.statusText = null;
        this.dialogContainer = null;
        this.dialogText = null;
    }

    init(data) {
        this.inventory = data?.inventory ?? null;
        this.crafting = data?.crafting ?? null;
        this.gameScene = data?.gameScene ?? null;
        this.runData = data?.runData ?? null;
    }

    create() {
        this.createHudBase();
        this.bindInventory();
        this.bindGameEvents();

        this.events.on('shutdown', () => this.cleanup(), this);
    }

    createHudBase() {
        this.add.rectangle(0, 0, this.scale.width, 48, 0x0c1324).setOrigin(0, 0).setAlpha(0.85);

        this.healthIcons = Array.from({ length: 6 }).map((_, index) => {
            const sprite = this.add.image(12 + index * 18, 24, 'item-torch');
            sprite.setScale(0.6);
            sprite.setVisible(false);
            return sprite;
        });

        this.inventoryText = this.add.text(120, 10, 'Inventory: --', {
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#d7e3ff',
        });

        this.keyText = this.add.text(120, 26, 'Keys: --', {
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#87f0ff',
        });

        this.statusText = this.add.text(this.scale.width - 8, this.scale.height - 8, '', {
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#e3f2fd',
            align: 'right',
            wordWrap: { width: this.scale.width - 16 },
        });
        this.statusText.setOrigin(1, 1);

        // Controls hint
        this.controlsText = this.add.text(8, this.scale.height - 24, 'WASD/Arrows: Move | Space/E: Interact | F: Attack | C: Craft', {
            fontFamily: 'monospace',
            fontSize: 10,
            color: '#87f0ff',
        });

        this.createDialogUI();
        this.createTouchControls();
    }

    createTouchControls() {
        // Only show on touch devices
        if (!this.sys.game.device.input.touch) return;

        const buttonSize = 64;
        const margin = 16;

        // Movement buttons
        this.upButton = this.add.circle(margin + buttonSize / 2, this.scale.height - margin - buttonSize * 2 - buttonSize / 2, buttonSize / 2, 0x334870, 0.8);
        this.upButton.setStrokeStyle(2, 0x87f0ff);
        this.upButton.setInteractive();
        this.upButton.on('pointerdown', () => this.gameScene.tryMove({ x: 0, y: -1 }));

        this.downButton = this.add.circle(margin + buttonSize / 2, this.scale.height - margin - buttonSize / 2, buttonSize / 2, 0x334870, 0.8);
        this.downButton.setStrokeStyle(2, 0x87f0ff);
        this.downButton.setInteractive();
        this.downButton.on('pointerdown', () => this.gameScene.tryMove({ x: 0, y: 1 }));

        this.leftButton = this.add.circle(margin - buttonSize / 2 + buttonSize, this.scale.height - margin - buttonSize, buttonSize / 2, 0x334870, 0.8);
        this.leftButton.setStrokeStyle(2, 0x87f0ff);
        this.leftButton.setInteractive();
        this.leftButton.on('pointerdown', () => this.gameScene.tryMove({ x: -1, y: 0 }));

        this.rightButton = this.add.circle(margin + buttonSize * 2 - buttonSize / 2, this.scale.height - margin - buttonSize, buttonSize / 2, 0x334870, 0.8);
        this.rightButton.setStrokeStyle(2, 0x87f0ff);
        this.rightButton.setInteractive();
        this.rightButton.on('pointerdown', () => this.gameScene.tryMove({ x: 1, y: 0 }));

        // Action buttons
        this.interactButton = this.add.rectangle(this.scale.width - margin - buttonSize, this.scale.height - margin - buttonSize, buttonSize, buttonSize, 0x334870, 0.8);
        this.interactButton.setStrokeStyle(2, 0x87f0ff);
        this.interactButton.setInteractive();
        this.interactButton.on('pointerdown', () => this.gameScene.handleInteract());

        const interactText = this.add.text(this.interactButton.x, this.interactButton.y, 'E', {
            fontFamily: 'monospace',
            fontSize: 16,
            color: '#f3f6ff',
        });
        interactText.setOrigin(0.5);

        this.attackButton = this.add.rectangle(this.scale.width - margin - buttonSize * 2 - margin, this.scale.height - margin - buttonSize, buttonSize, buttonSize, 0x334870, 0.8);
        this.attackButton.setStrokeStyle(2, 0x87f0ff);
        this.attackButton.setInteractive();
        this.attackButton.on('pointerdown', () => this.gameScene.handleAttack());

        const attackText = this.add.text(this.attackButton.x, this.attackButton.y, 'F', {
            fontFamily: 'monospace',
            fontSize: 16,
            color: '#f3f6ff',
        });
        attackText.setOrigin(0.5);
    }

    createDialogUI() {
        const dialogWidth = this.scale.width - 32;
        const dialogHeight = 96;
        const dialogX = 16 + dialogWidth / 2;
        const dialogY = this.scale.height - dialogHeight / 2 - 32;

        this.dialogContainer = this.add.container(dialogX, dialogY);
        const background = this.add.rectangle(0, 0, dialogWidth, dialogHeight, 0x111b31, 0.88);
        background.setStrokeStyle(1, 0x334870);
        this.dialogTitle = this.add.text(-dialogWidth / 2 + 8, -dialogHeight / 2 + 4, '', {
            fontFamily: 'monospace',
            fontSize: 14,
            color: '#f3f6ff',
        });
        this.dialogText = this.add.text(-dialogWidth / 2 + 8, -dialogHeight / 2 + 24, '', {
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#d1dcff',
            wordWrap: { width: dialogWidth - 16 },
        });

        this.dialogContainer.add([background, this.dialogTitle, this.dialogText]);
        this.dialogContainer.setVisible(false);

        this.input.keyboard.on('keydown-ESC', () => this.hideDialog());
        this.input.keyboard.on('keydown-ENTER', () => this.hideDialog());
        this.input.on('pointerdown', () => this.hideDialog());
    }

    bindInventory() {
        if (!this.inventory) {
            return;
        }

        const refreshInventory = () => {
            const snapshot = this.inventory.snapshot();
            const inventoryLine = Object.entries(snapshot.items)
                .map(([item, amount]) => `${item} x${amount}`)
                .join(', ') || 'Empty';
            const keyLine = Object.entries(snapshot.keys)
                .map(([color, amount]) => `${color} x${amount}`)
                .join(', ') || 'None';

            this.inventoryText.setText(`Inventory: ${inventoryLine}`);
            this.keyText.setText(`Keys: ${keyLine}`);
        };

        refreshInventory();
        this.inventory.on('changed', refreshInventory);

        this.events.once('shutdown', () => {
            this.inventory.off('changed', refreshInventory);
        });
    }

    bindGameEvents() {
        if (!this.gameScene) {
            return;
        }

        const updateHealth = ({ health, maxHealth }) => {
            this.healthIcons.forEach((icon, index) => {
                icon.setVisible(index < maxHealth);
                icon.setAlpha(index < health ? 1 : 0.25);
            });
        };

        const updateStatus = (lines) => {
            this.statusText.setText((lines ?? []).join('\n'));
        };

        const showDialog = ({ title, lines }) => {
            this.dialogTitle.setText(title ?? '');
            this.dialogText.setText((lines ?? []).join('\n'));
            this.dialogContainer.setVisible(true);
        };

        const hideDialog = () => {
            this.dialogContainer.setVisible(false);
        };

        const goalReached = (event) => {
            this.dialogTitle.setText('Loop Anchor Stabilised');
            this.dialogText.setText(event.summary ?? 'You stabilised the loop.');
            this.dialogContainer.setVisible(true);
        };

        this.gameScene.events.on('player-health', updateHealth);
        this.gameScene.events.on('status-update', updateStatus);
        this.gameScene.events.on('dialog-open', showDialog);
        this.gameScene.events.on('goal-reached', goalReached);
        this.gameScene.events.on('dialog-close', hideDialog);

        this.events.once('shutdown', () => {
            this.gameScene.events.off('player-health', updateHealth);
            this.gameScene.events.off('status-update', updateStatus);
            this.gameScene.events.off('dialog-open', showDialog);
            this.gameScene.events.off('goal-reached', goalReached);
            this.gameScene.events.off('dialog-close', hideDialog);
        });
    }

    hideDialog() {
        if (this.dialogContainer?.visible) {
            this.dialogContainer.setVisible(false);
            this.gameScene?.events.emit('dialog-close');
        }
    }

    cleanup() {
        this.hideDialog();
    }
}
