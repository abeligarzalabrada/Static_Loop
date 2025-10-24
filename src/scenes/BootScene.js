const Phaser = window.Phaser;

import StoryManager from '../system/StoryManager.js';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        this.load.setPath('./');
        this.load.json('baseStory', 'data/baseStory.json');

        const imageAssets = [
            { key: 'tile-floor', path: 'assets/tiles/tile-floor.png' },
            { key: 'tile-wall', path: 'assets/tiles/tile-wall.png' },
            { key: 'tile-switch-off', path: 'assets/tiles/tile-switch-off.png' },
            { key: 'tile-switch-on', path: 'assets/tiles/tile-switch-on.png' },
            { key: 'tile-door-red', path: 'assets/tiles/tile-door-red.png' },
            { key: 'tile-door-blue', path: 'assets/tiles/tile-door-blue.png' },
            { key: 'tile-door-green', path: 'assets/tiles/tile-door-green.png' },
            { key: 'door-opened', path: 'assets/tiles/door-opened.png' },
            { key: 'box', path: 'assets/tiles/box.png' },
            { key: 'resource-wood', path: 'assets/items/resource-wood.png' },
            { key: 'resource-ore', path: 'assets/items/resource-ore.png' },
            { key: 'item-torch', path: 'assets/items/item-torch.png' },
            { key: 'item-key-red', path: 'assets/items/item-key-red.png' },
            { key: 'item-key-blue', path: 'assets/items/item-key-blue.png' },
            { key: 'item-key-green', path: 'assets/items/item-key-green.png' },
            { key: 'event', path: 'assets/items/event.png' },
            { key: 'hud-panel', path: 'assets/ui/hud-panel.png' },
            { key: 'hud-dialog', path: 'assets/ui/hud-dialog.png' },
            { key: 'player', path: 'assets/characters/player.png' },
            { key: 'npc', path: 'assets/characters/npc.png' },
            { key: 'enemy', path: 'assets/characters/enemy.png' },
            { key: 'loop_warden', path: 'assets/characters/loop_warden.png' },
            { key: 'atrium_scavenger', path: 'assets/characters/atrium_scavenger.png' },
            { key: 'byte_smith', path: 'assets/characters/byte_smith.png' },
            { key: 'hallway_hunter', path: 'assets/characters/hallway_hunter.png' },
            { key: 'vault_guardian', path: 'assets/characters/vault_guardian.png' },
        ];

        imageAssets.forEach((asset) => this.load.image(asset.key, asset.path));
    }

    create() {
        const baseStory = this.cache.json.get('baseStory');
        if (!baseStory) {
            console.error('Failed to load baseStory.json');
        } else {
            StoryManager.setBaseStory(baseStory);
        }

        this.ensureFallbackTextures();
        this.scene.start('TitleScene');
    }

    ensureFallbackTextures() {
        const textures = [
            { key: 'tile-floor', color: 0x2a3042 },
            { key: 'tile-wall', color: 0x1c2132 },
            { key: 'tile-switch-off', color: 0x424c70 },
            { key: 'tile-switch-on', color: 0x68c4ff },
            { key: 'tile-door-red', color: 0xb54a4a },
            { key: 'tile-door-blue', color: 0x4a7cb5 },
            { key: 'tile-door-green', color: 0x4ab55b },
            { key: 'box', color: 0x9c774d },
            { key: 'player', color: 0xf4f7ff },
            { key: 'npc', color: 0xe0b874 },
            { key: 'enemy', color: 0xbf3f5a },
            { key: 'resource-wood', color: 0x8f9c4d },
            { key: 'resource-ore', color: 0x8c92b3 },
            { key: 'item-torch', color: 0xffd27f },
            { key: 'item-key-red', color: 0xff8484 },
            { key: 'item-key-blue', color: 0x6fb5ff },
            { key: 'item-key-green', color: 0x6fffc4 },
            { key: 'hud-panel', color: 0x101829 },
            { key: 'hud-dialog', color: 0x111b31 },
            { key: 'door-opened', color: 0x223349 },
            { key: 'event', color: 0xfff082 },
        ];

        textures.forEach((def) => {
            if (this.textures.exists(def.key)) {
                return;
            }

            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(def.color, 1);
            graphics.fillRect(0, 0, 16, 16);
            graphics.generateTexture(def.key, 16, 16);
            graphics.destroy();
        });
    }
}
