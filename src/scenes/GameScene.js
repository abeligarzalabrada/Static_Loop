const Phaser = window.Phaser;

import WorldManager from '../system/WorldManager.js';
import EntityManager from '../system/EntityManager.js';

const TILE_SIZE = 16;
const MOVEMENT_DELAY = 125;

function tileToWorld(index) {
    return index * TILE_SIZE + TILE_SIZE / 2;
}

function keyToDir(keyCode) {
    switch (keyCode) {
    case 'LEFT':
    case 'A':
        return { x: -1, y: 0 };
    case 'RIGHT':
    case 'D':
        return { x: 1, y: 0 };
    case 'UP':
    case 'W':
        return { x: 0, y: -1 };
    case 'DOWN':
    case 'S':
        return { x: 0, y: 1 };
    default:
        return null;
    }
}

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.worldManager = null;
        this.entityManager = null;
        this.player = null;
        this.playerWorldPos = { x: 0, y: 0 }; // Global world position
        this.occupancy = {};
        this.lastMoveTime = 0;
        this.renderedChunks = new Set(); // Track rendered chunks
    }

    create() {
        this.worldManager = new WorldManager();
        this.entityManager = new EntityManager(this.worldManager);

        this.cursors = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
        });

        this.input.keyboard.on('keydown', (event) => {
            const dir = keyToDir(event.code?.replace('Key', '').replace('Arrow', '').toUpperCase());
            if (dir) {
                this.tryMove(dir);
            }
        });

        // Start at world position 0,0
        this.playerWorldPos = { x: 0, y: 0 };
        this.updateWorld();
    }

    updateWorld() {
        const { chunkX, chunkY } = this.worldManager.worldToChunk(this.playerWorldPos.x, this.playerWorldPos.y);
        this.worldManager.updateLoadedChunks(chunkX, chunkY);
        this.entityManager.loadEntities();

        // Clear previous layers
        if (this.mapLayer) {
            this.mapLayer.destroy(true);
        }
        if (this.actorLayer) {
            this.actorLayer.destroy(true);
        }

        this.mapLayer = this.add.layer();
        this.actorLayer = this.add.layer();
        this.occupancy = {};
        this.renderedChunks.clear();

        // Set large bounds for infinite world
        this.physics.world.setBounds(-10000, -10000, 20000, 20000);

        // Render chunks
        for (const chunkKey of this.worldManager.activeChunks) {
            this.renderChunk(chunkKey);
        }

        // Place or update player
        this.placePlayer();

        // Spawn entities from chunks
        this.spawnEntitiesFromChunks();
    }

    renderChunk(chunkKey) {
        if (this.renderedChunks.has(chunkKey)) return;
        this.renderedChunks.add(chunkKey);

        const [cx, cy] = chunkKey.split('_').map(Number);
        const chunk = this.worldManager.loadedChunks.get(chunkKey);
        if (!chunk) return;

        const chunkWorldX = cx * 16 * 16; // CHUNK_SIZE * TILE_SIZE
        const chunkWorldY = cy * 16 * 16;

        chunk.tiles.forEach((row, y) => {
            row.forEach((tile, x) => {
                const worldX = chunkWorldX + x * 16 + 8;
                const worldY = chunkWorldY + y * 16 + 8;
                const sprite = this.add.image(worldX, worldY, `tile-${tile}`).setOrigin(0.5);
                this.mapLayer.add(sprite);
                if (tile === 'tree' || tile === 'rock' || tile === 'bush' || tile === 'cactus') {
                    this.setOccupant(worldX, worldY, { type: 'obstacle' });
                }
            });
        });
    }

    placePlayer() {
        if (!this.player) {
            this.player = this.add.image(this.playerWorldPos.x, this.playerWorldPos.y, 'player');
            this.player.setOrigin(0.5);
            this.actorLayer.add(this.player);
        } else {
            this.player.setPosition(this.playerWorldPos.x, this.playerWorldPos.y);
        }
        this.player.setDepth(10);
    }

    spawnEntitiesFromChunks() {
        for (const chunkKey of this.worldManager.activeChunks) {
            const entities = this.entityManager.getEntitiesInChunk(...chunkKey.split('_').map(Number));
            entities.forEach(entity => {
                this.spawnEntity(entity);
            });
        }
    }

    spawnEntity(entity) {
        const sprite = this.add.image(entity.x, entity.y, `entity-${entity.type}`).setOrigin(0.5);
        this.actorLayer.add(sprite);
        sprite.setData('entity', entity);
        // Simple entities, no special logic
    }

    tryMove(direction) {
        const now = this.time.now;
        if (now - this.lastMoveTime < MOVEMENT_DELAY) {
            return;
        }

        const targetPos = {
            x: this.playerWorldPos.x + direction.x * TILE_SIZE,
            y: this.playerWorldPos.y + direction.y * TILE_SIZE,
        };

        const occupant = this.getOccupant(targetPos.x, targetPos.y);
        if (!occupant) {
            this.commitPlayerMove(targetPos);
            return;
        }

        if (occupant.type === 'obstacle') {
            return;
        }

        this.commitPlayerMove(targetPos);
    }

    commitPlayerMove(pos) {
        this.lastMoveTime = this.time.now;
        this.playerWorldPos = { ...pos };

        // Check if chunk changed
        const oldChunk = this.worldManager.worldToChunk(this.player.x, this.player.y);
        const newChunk = this.worldManager.worldToChunk(pos.x, pos.y);
        if (oldChunk.chunkX !== newChunk.chunkX || oldChunk.chunkY !== newChunk.chunkY) {
            this.updateWorld();
        }

        this.tweens.add({
            targets: this.player,
            duration: MOVEMENT_DELAY,
            x: pos.x,
            y: pos.y,
        });
    }

    setOccupant(x, y, payload) {
        const key = this.tileKey(x, y);
        if (!payload) {
            delete this.occupancy[key];
            return;
        }
        this.occupancy[key] = payload;
    }

    getOccupant(x, y) {
        const key = this.tileKey(x, y);
        const payload = this.occupancy[key];
        if (payload) {
            return payload;
        }
        if (Math.abs(this.playerWorldPos.x - x) < TILE_SIZE / 2 && Math.abs(this.playerWorldPos.y - y) < TILE_SIZE / 2) {
            return { type: 'player' };
        }
        return null;
    }

    tileKey(x, y) {
        return `${Math.round(x)}_${Math.round(y)}`;
    }
}
