const Phaser = window.Phaser;

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        this.load.setPath('./');

        const imageAssets = [
            { key: 'tile-grass', path: 'assets/tiles/tile-grass.png' },
            { key: 'tile-sand', path: 'assets/tiles/tile-sand.png' },
            { key: 'tile-tree', path: 'assets/tiles/tile-tree.png' },
            { key: 'tile-bush', path: 'assets/tiles/tile-bush.png' },
            { key: 'tile-rock', path: 'assets/tiles/tile-rock.png' },
            { key: 'tile-cactus', path: 'assets/tiles/tile-cactus.png' },
            { key: 'tile-flower', path: 'assets/tiles/tile-flower.png' },
            { key: 'entity-wolf', path: 'assets/entities/entity-wolf.png' },
            { key: 'entity-rabbit', path: 'assets/entities/entity-rabbit.png' },
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
            { key: 'tile-grass', color: 0x4a7c59 },
            { key: 'tile-sand', color: 0xc2b280 },
            { key: 'tile-tree', color: 0x2d5016 },
            { key: 'tile-bush', color: 0x5a8f3d },
            { key: 'tile-rock', color: 0x666666 },
            { key: 'tile-cactus', color: 0x2d5a27 },
            { key: 'tile-flower', color: 0xff69b4 },
            { key: 'entity-wolf', color: 0x8b4513 },
            { key: 'entity-rabbit', color: 0xffffff },
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
