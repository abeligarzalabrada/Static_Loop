const Phaser = window.Phaser;

export default class EntityManager {
    constructor(worldManager) {
        this.worldManager = worldManager;
        this.entities = new Map(); // Map of entity id -> entity data
        this.nextId = 1;
    }

    // Create a new entity
    createEntity(type, x, y, properties = {}) {
        const id = this.nextId++;
        const entity = {
            id,
            type,
            x,
            y,
            properties: { ...properties },
            chunkKey: null, // Will be set when placed
            created: Date.now()
        };
        this.entities.set(id, entity);
        return entity;
    }

    // Place entity in a chunk
    placeEntity(entity, chunkX, chunkY) {
        const chunk = this.worldManager.getChunk(chunkX, chunkY);
        entity.chunkKey = `${chunkX}_${chunkY}`;
        if (!chunk.entities) chunk.entities = [];
        chunk.entities.push(entity);
        this.worldManager.saveChunk(entity.chunkKey, chunk);
    }

    // Remove entity from chunk
    removeEntity(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity || !entity.chunkKey) return;

        const chunk = this.worldManager.loadedChunks.get(entity.chunkKey);
        if (chunk && chunk.entities) {
            chunk.entities = chunk.entities.filter(e => e.id !== entityId);
            this.worldManager.saveChunk(entity.chunkKey, chunk);
        }
        this.entities.delete(entityId);
    }

    // Get entities in a chunk
    getEntitiesInChunk(chunkX, chunkY) {
        const chunk = this.worldManager.getChunk(chunkX, chunkY);
        return chunk.entities || [];
    }

    // Load entities from loaded chunks
    loadEntities() {
        for (const chunk of this.worldManager.loadedChunks.values()) {
            if (chunk.entities) {
                chunk.entities.forEach(entity => {
                    this.entities.set(entity.id, entity);
                    if (entity.id >= this.nextId) this.nextId = entity.id + 1;
                });
            }
        }
    }

    // Save all entities (called periodically or on unload)
    saveEntities() {
        // Entities are saved per chunk in WorldManager
    }

    // Update entity position
    updateEntityPosition(entityId, newX, newY) {
        const entity = this.entities.get(entityId);
        if (!entity) return;

        const oldChunk = entity.chunkKey;
        const { chunkX, chunkY } = this.worldManager.worldToChunk(newX, newY);
        const newChunk = `${chunkX}_${chunkY}`;

        entity.x = newX;
        entity.y = newY;

        if (oldChunk !== newChunk) {
            // Move to new chunk
            this.removeEntity(entityId);
            entity.chunkKey = newChunk;
            this.placeEntity(entity, chunkX, chunkY);
        } else {
            // Update in same chunk
            const chunk = this.worldManager.loadedChunks.get(newChunk);
            if (chunk && chunk.entities) {
                const index = chunk.entities.findIndex(e => e.id === entityId);
                if (index !== -1) {
                    chunk.entities[index] = entity;
                    this.worldManager.saveChunk(newChunk, chunk);
                }
            }
        }
    }

    // Get entity by id
    getEntity(id) {
        return this.entities.get(id);
    }

    // Get all entities
    getAllEntities() {
        return Array.from(this.entities.values());
    }
}