const Phaser = window.Phaser;

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        this.load.setPath('./');

        const imageAssets = [
            { key: 'tile-floor', path: 'assets/tiles/tile-floor.png' },
            { key: 'tile-wall', path: 'assets/tiles/tile-wall.png' },
            { key: 'tile-rock', path: 'assets/tiles/tile-rock.png' },
            { key: 'tile-torch', path: 'assets/tiles/tile-torch.png' },
            { key: 'tile-door-blue', path: 'assets/tiles/tile-door-blue.png' },
            { key: 'tile-door-green', path: 'assets/tiles/tile-door-green.png' },
            { key: 'tile-door-red', path: 'assets/tiles/tile-door-red.png' },
            { key: 'entity-wolf', path: 'assets/entities/entity-wolf.png' },
            { key: 'entity-spider', path: 'assets/entities/entity-spider.png' },
            { key: 'entity-scorpion', path: 'assets/entities/entity-scorpion.png' },
            { key: 'player', path: 'assets/characters/player.png' },
        ];

        imageAssets.forEach((asset) => this.load.image(asset.key, asset.path));
    }

    create() {
        this.ensureFallbackTextures();
        this.scene.start('GameScene');
    }

    ensureFallbackTextures() {
        const textures = [
            { key: 'tile-floor', color: 0x2a2a2a },
            { key: 'tile-wall', color: 0x1a1a1a },
            { key: 'tile-rock', color: 0x404040 },
            { key: 'tile-torch', color: 0xff6600 },
            { key: 'tile-door-blue', color: 0x0066cc },
            { key: 'tile-door-green', color: 0x00cc66 },
            { key: 'tile-door-red', color: 0xcc0000 },
            { key: 'entity-wolf', color: 0x8b4513 },
            { key: 'entity-spider', color: 0x2d2d2d },
            { key: 'entity-scorpion', color: 0x8b4513 },
            { key: 'player', color: 0xf4f7ff },
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
