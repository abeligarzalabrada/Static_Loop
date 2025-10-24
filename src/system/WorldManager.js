const Phaser = window.Phaser;

const CHUNK_SIZE = 16; // 16x16 tiles per chunk
const TILE_SIZE = 16;

// Chunk presets: define types of chunks with generation rules
const CHUNK_PRESETS = {
    forest: {
        baseTile: 'grass',
        features: [
            { type: 'tree', density: 0.3, cluster: true },
            { type: 'bush', density: 0.2 },
            { type: 'rock', density: 0.1 }
        ],
        enemies: ['wolf', 'spider'],
        resources: ['wood', 'herb']
    },
    desert: {
        baseTile: 'sand',
        features: [
            { type: 'cactus', density: 0.15 },
            { type: 'rock', density: 0.25 }
        ],
        enemies: ['scorpion'],
        resources: ['sand', 'cactus_flower']
    },
    plains: {
        baseTile: 'grass',
        features: [
            { type: 'flower', density: 0.1 },
            { type: 'bush', density: 0.05 }
        ],
        enemies: ['rabbit', 'deer'],
        resources: ['wheat', 'herb']
    },
    // Add more presets as needed
};

// Simple seeded random number generator
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    random() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
}

export default class WorldManager {
    constructor() {
        this.loadedChunks = new Map(); // Map of 'x_y' -> chunk data
        this.activeChunks = new Set(); // Set of active chunk keys
        this.chunkRange = 2; // Load chunks within 2 chunks of player
    }

    // Generate or load a chunk at given coordinates
    getChunk(chunkX, chunkY) {
        const key = `${chunkX}_${chunkY}`;
        if (this.loadedChunks.has(key)) {
            return this.loadedChunks.get(key);
        }

        // Try to load from storage
        const stored = localStorage.getItem(`chunk_${key}`);
        if (stored) {
            const chunk = JSON.parse(stored);
            this.loadedChunks.set(key, chunk);
            return chunk;
        }

        // Generate new chunk
        const chunk = this.generateChunk(chunkX, chunkY);
        this.loadedChunks.set(key, chunk);
        this.saveChunk(key, chunk);
        return chunk;
    }

    // Generate a chunk procedurally based on presets
    generateChunk(chunkX, chunkY) {
        const seed = chunkX * 10000 + chunkY; // Simple seed based on coords
        const rand = new SeededRandom(seed);

        // Determine preset based on position (simple biome selection)
        const biomeValue = Math.abs(chunkX + chunkY) % 3;
        let preset;
        if (biomeValue === 0) preset = CHUNK_PRESETS.forest;
        else if (biomeValue === 1) preset = CHUNK_PRESETS.desert;
        else preset = CHUNK_PRESETS.plains;

        const tiles = [];
        for (let y = 0; y < CHUNK_SIZE; y++) {
            tiles[y] = [];
            for (let x = 0; x < CHUNK_SIZE; x++) {
                tiles[y][x] = preset.baseTile;
            }
        }

        // Add features
        preset.features.forEach(feature => {
            const count = Math.floor(CHUNK_SIZE * CHUNK_SIZE * feature.density);
            for (let i = 0; i < count; i++) {
                let x, y;
                if (feature.cluster) {
                    // Cluster features together
                    const centerX = Math.floor(rand.random() * CHUNK_SIZE);
                    const centerY = Math.floor(rand.random() * CHUNK_SIZE);
                    x = Math.max(0, Math.min(CHUNK_SIZE - 1, centerX + Math.floor((rand.random() - 0.5) * 4)));
                    y = Math.max(0, Math.min(CHUNK_SIZE - 1, centerY + Math.floor((rand.random() - 0.5) * 4)));
                } else {
                    x = Math.floor(rand.random() * CHUNK_SIZE);
                    y = Math.floor(rand.random() * CHUNK_SIZE);
                }
                // Ensure the tile exists before setting it
                if (tiles[y] && tiles[y][x] !== undefined) {
                    tiles[y][x] = feature.type;
                }
            }
        });

        return {
            x: chunkX,
            y: chunkY,
            tiles,
            entities: [], // Will be populated by EntityManager
            lastVisited: Date.now()
        };
    }

    // Save chunk to localStorage
    saveChunk(key, chunk) {
        try {
            localStorage.setItem(`chunk_${key}`, JSON.stringify(chunk));
        } catch (e) {
            console.warn('Failed to save chunk', key, e);
        }
    }

    // Update loaded chunks based on player position
    updateLoadedChunks(playerChunkX, playerChunkY) {
        const newActive = new Set();
        for (let dx = -this.chunkRange; dx <= this.chunkRange; dx++) {
            for (let dy = -this.chunkRange; dy <= this.chunkRange; dy++) {
                const cx = playerChunkX + dx;
                const cy = playerChunkY + dy;
                const key = `${cx}_${cy}`;
                newActive.add(key);
                if (!this.activeChunks.has(key)) {
                    this.getChunk(cx, cy); // Load if not loaded
                }
            }
        }

        // Unload chunks outside range
        for (const key of this.activeChunks) {
            if (!newActive.has(key)) {
                // Save before unloading
                const chunk = this.loadedChunks.get(key);
                if (chunk) {
                    this.saveChunk(key, chunk);
                }
                this.loadedChunks.delete(key);
            }
        }

        this.activeChunks = newActive;
    }

    // Normalize modulo to always be positive
    #posMod(n, m) {
        return ((n % m) + m) % m;
    }

    // Get tile at world position
    getTile(worldX, worldY) {
        const worldSize = CHUNK_SIZE * TILE_SIZE;
        const chunkX = Math.floor(Math.floor(worldX) / worldSize);
        const chunkY = Math.floor(Math.floor(worldY) / worldSize);
        const chunk = this.getChunk(chunkX, chunkY);
        const localX = Math.floor(this.#posMod(Math.floor(worldX), worldSize) / TILE_SIZE);
        const localY = Math.floor(this.#posMod(Math.floor(worldY), worldSize) / TILE_SIZE);
        return chunk.tiles[localY]?.[localX] ?? 'void';
    }

    // Set tile at world position
    setTile(worldX, worldY, tileType) {
        const worldSize = CHUNK_SIZE * TILE_SIZE;
        const chunkX = Math.floor(Math.floor(worldX) / worldSize);
        const chunkY = Math.floor(Math.floor(worldY) / worldSize);
        const chunk = this.getChunk(chunkX, chunkY);
        const localX = Math.floor(this.#posMod(Math.floor(worldX), worldSize) / TILE_SIZE);
        const localY = Math.floor(this.#posMod(Math.floor(worldY), worldSize) / TILE_SIZE);
        if (chunk.tiles[localY] && chunk.tiles[localY][localX] !== undefined) {
            chunk.tiles[localY][localX] = tileType;
            chunk.lastVisited = Date.now();
            this.saveChunk(`${chunkX}_${chunkY}`, chunk);
        }
    }

    // Get chunk coordinates from world position
    worldToChunk(worldX, worldY) {
        const worldSize = CHUNK_SIZE * TILE_SIZE;
        const chunkX = Math.floor(Math.floor(worldX) / worldSize);
        const chunkY = Math.floor(Math.floor(worldY) / worldSize);
        const localX = Math.floor(this.#posMod(Math.floor(worldX), worldSize) / TILE_SIZE);
        const localY = Math.floor(this.#posMod(Math.floor(worldY), worldSize) / TILE_SIZE);
        return { chunkX, chunkY, localX, localY };
    }

    // Convert chunk coords to world position
    chunkToWorld(chunkX, chunkY, localX = 0, localY = 0) {
        return {
            x: chunkX * CHUNK_SIZE * TILE_SIZE + localX * TILE_SIZE + TILE_SIZE / 2,
            y: chunkY * CHUNK_SIZE * TILE_SIZE + localY * TILE_SIZE + TILE_SIZE / 2
        };
    }
}