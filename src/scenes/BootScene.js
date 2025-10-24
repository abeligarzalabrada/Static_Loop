const Phaser = window.Phaser;

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        this.load.setPath('./');

        const imageAssets = [
            // Dungeon tiles
            { key: 'tile-floor', path: 'assets/tiles/tile-floor.png' },
            { key: 'tile-wall', path: 'assets/tiles/tile-wall.png' },
            { key: 'tile-rock', path: 'assets/tiles/tile-rock.png' },
            { key: 'tile-door-blue', path: 'assets/tiles/tile-door-blue.png' },
            { key: 'tile-door-green', path: 'assets/tiles/tile-door-green.png' },
            { key: 'tile-door-red', path: 'assets/tiles/tile-door-red.png' },
            // Keep some old tiles as fallbacks
            { key: 'tile-grass', path: 'assets/tiles/tile-grass.png' },
            { key: 'tile-sand', path: 'assets/tiles/tile-sand.png' },
            { key: 'tile-tree', path: 'assets/tiles/tile-tree.png' },
            { key: 'tile-bush', path: 'assets/tiles/tile-bush.png' },
            { key: 'tile-cactus', path: 'assets/tiles/tile-cactus.png' },
            { key: 'tile-flower', path: 'assets/tiles/tile-flower.png' },
            // Entities
            { key: 'entity-wolf', path: 'assets/entities/entity-wolf.png' },
            { key: 'entity-spider', path: 'assets/entities/entity-spider.png' },
            { key: 'entity-scorpion', path: 'assets/entities/entity-scorpion.png' },
            { key: 'entity-rabbit', path: 'assets/entities/entity-rabbit.png' },
            { key: 'entity-deer', path: 'assets/entities/entity-deer.png' },
            // Player
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
            // Dungeon tiles
            { key: 'tile-floor', color: 0x2a2a2a },
            { key: 'tile-wall', color: 0x1a1a1a },
            { key: 'tile-rock', color: 0x404040 },
            { key: 'tile-door-blue', color: 0x0066cc },
            { key: 'tile-door-green', color: 0x00cc66 },
            { key: 'tile-door-red', color: 0xcc0000 },
            // Fallback tiles
            { key: 'tile-grass', color: 0x4a7c59 },
            { key: 'tile-sand', color: 0xc2b280 },
            { key: 'tile-tree', color: 0x2d5016 },
            { key: 'tile-bush', color: 0x5a8f3d },
            { key: 'tile-cactus', color: 0x2d5a27 },
            { key: 'tile-flower', color: 0xff69b4 },
            // Entities
            { key: 'entity-wolf', color: 0x8b4513 },
            { key: 'entity-spider', color: 0x2d2d2d },
            { key: 'entity-scorpion', color: 0x8b4513 },
            { key: 'entity-rabbit', color: 0xffffff },
            { key: 'entity-deer', color: 0x8b4513 },
            // Player
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
