const Phaser = window.Phaser;

import StoryManager from '../system/StoryManager.js';
import Inventory from '../system/Inventory.js';
import CraftingSystem from '../system/CraftingSystem.js';

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
        this.runData = null;
        this.inventory = null;
        this.crafting = null;
        this.player = null;
        this.currentRoom = null;
        this.playerTile = { x: 0, y: 0 };
        this.occupancy = new Map();
        this.lastMoveTime = 0;
        this.health = 5;
        this.maxHealth = 5;
        this.enemies = [];
        this.switches = [];
        this.doors = new Map();
        this.statusMessages = [];
    }

    init(data) {
        this.runData = data?.runData ?? StoryManager.getCurrentRun();
        if (!this.runData) {
            this.runData = StoryManager.getBaseStory();
        }
    }

    create() {
        this.inventory = new Inventory();
        this.crafting = new CraftingSystem(this.inventory, this.runData?.craftingRecipes ?? []);

        this.cursors = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            interact: Phaser.Input.Keyboard.KeyCodes.SPACE,
            action: Phaser.Input.Keyboard.KeyCodes.E,
            craft: Phaser.Input.Keyboard.KeyCodes.C,
            attack: Phaser.Input.Keyboard.KeyCodes.F,
        });

        this.input.keyboard.on('keydown', (event) => {
            const dir = keyToDir(event.code?.replace('Key', '').replace('Arrow', '').toUpperCase());
            if (dir) {
                this.tryMove(dir);
            }
        });

        this.input.keyboard.on('keydown-SPACE', () => this.handleInteract());
        this.input.keyboard.on('keydown-E', () => this.handleInteract());
        this.input.keyboard.on('keydown-C', () => this.handleCraft());
        this.input.keyboard.on('keydown-F', () => this.handleAttack());

        this.scene.launch('UIScene', {
            inventory: this.inventory,
            crafting: this.crafting,
            gameScene: this,
            runData: this.runData,
        });

        const startRoomId = this.runData?.world?.playerStartRoom ?? this.runData?.rooms?.[0]?.id;
        this.loadRoom(startRoomId);

        this.time.addEvent({
            delay: 450,
            loop: true,
            callback: () => this.updateEnemies(),
        });

        this.updateUI();
    }

    loadRoom(roomId) {
        const room = this.runData.rooms.find((entry) => entry.id === roomId);
        if (!room) {
            console.warn('[GameScene] Missing room', roomId);
            return;
        }

        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
        if (this.mapLayer) {
            this.mapLayer.destroy(true);
        }
        if (this.actorLayer) {
            this.actorLayer.destroy(true);
        }

        this.currentRoom = room;
        this.mapLayer = this.add.layer();
        this.actorLayer = this.add.layer();
        this.occupancy.clear();
        this.switches = [];
        this.doors.clear();
        this.enemies = [];

        this.physics.world.setBounds(0, 0, room.tiles[0].length * TILE_SIZE, room.tiles.length * TILE_SIZE);

        this.buildStaticTiles(room);
        this.buildDynamicObjects(room);
        this.placePlayer(room);
        this.spawnNPCs(room);
        this.spawnResources(room);
        this.spawnItems(room);
        this.spawnEnemies(room);
        this.spawnEvents(room);
    }

    buildStaticTiles(room) {
        const { tiles } = room;
        tiles.forEach((row, y) => {
            [...row].forEach((symbol, x) => {
                const floor = this.add.image(tileToWorld(x), tileToWorld(y), 'tile-floor').setOrigin(0.5);
                this.mapLayer.add(floor);
                if (symbol === 'W') {
                    const wall = this.add.image(tileToWorld(x), tileToWorld(y), 'tile-wall').setOrigin(0.5);
                    this.mapLayer.add(wall);
                    this.setOccupant(x, y, { type: 'wall' });
                }
            });
        });
    }

    buildDynamicObjects(room) {
        (room.doors ?? []).forEach((door) => {
            const sprite = this.add.image(tileToWorld(door.position.x), tileToWorld(door.position.y), `tile-door-${door.color}`);
            sprite.setOrigin(0.5);
            this.actorLayer.add(sprite);
            this.setOccupant(door.position.x, door.position.y, {
                type: 'door',
                door,
                sprite,
                closed: true,
            });
            this.doors.set(door.id, { ...door, sprite, closed: true });
        });

        const roomObjects = (this.runData.objects ?? []).filter((obj) => obj.roomId === room.id);
        roomObjects.forEach((object) => {
            const { x, y } = object.position;
            if (object.type === 'switch') {
                const sprite = this.add.image(tileToWorld(x), tileToWorld(y), 'tile-switch-off');
                sprite.setOrigin(0.5);
                 this.actorLayer.add(sprite);
                const switchData = { ...object, sprite, active: false };
                this.switches.push(switchData);
                this.setOccupant(x, y, { type: 'switch', data: switchData });
            } else if (object.type === 'box') {
                const sprite = this.add.image(tileToWorld(x), tileToWorld(y), 'box');
                sprite.setOrigin(0.5);
                this.actorLayer.add(sprite);
                this.setOccupant(x, y, { type: 'box', sprite, data: object });
            }
        });
    }

    placePlayer(room) {
        const spawnPos = room.playerSpawn ?? this.runData.world?.playerStartPosition;
        const fallback = { x: 2, y: 2 };
        const pos = spawnPos ?? fallback;

        if (!this.player) {
            this.player = this.add.image(tileToWorld(pos.x), tileToWorld(pos.y), 'player');
            this.player.setOrigin(0.5);
            this.actorLayer.add(this.player);
        } else {
            this.player.setPosition(tileToWorld(pos.x), tileToWorld(pos.y));
        }

        this.playerTile = { ...pos };
        this.playerDepth = 10;
    }

    spawnNPCs(room) {
        const npcs = (this.runData.npcs ?? []).filter((npc) => npc.roomId === room.id);
        npcs.forEach((npc) => {
            const sprite = this.add.image(tileToWorld(npc.position.x), tileToWorld(npc.position.y), 'npc');
            sprite.setOrigin(0.5);
            this.actorLayer.add(sprite);
            sprite.setData('npc-data', npc);
            sprite.setName(`npc-${npc.id}`);
            this.setOccupant(npc.position.x, npc.position.y, { type: 'npc', sprite, npc });
        });
    }

    spawnResources(room) {
        const resources = (this.runData.objects ?? []).filter((obj) => obj.roomId === room.id && obj.type === 'resource');
        resources.forEach((resource) => {
            const key = resource.resourceId === 'wood' ? 'resource-wood' : 'resource-ore';
            const sprite = this.add.image(tileToWorld(resource.position.x), tileToWorld(resource.position.y), key);
            sprite.setOrigin(0.5);
            this.actorLayer.add(sprite);
            this.setOccupant(resource.position.x, resource.position.y, { type: 'resource', sprite, resource });
        });
    }

    spawnItems(room) {
        const items = (this.runData.objects ?? []).filter((obj) => obj.roomId === room.id && obj.type === 'item');
        items.forEach((item) => {
            const texture = this.resolveItemTexture(item.itemId);
            const sprite = this.add.image(tileToWorld(item.position.x), tileToWorld(item.position.y), texture);
            sprite.setOrigin(0.5);
            this.actorLayer.add(sprite);
            this.setOccupant(item.position.x, item.position.y, { type: 'item', sprite, item });
        });
    }

    resolveItemTexture(itemId) {
        if (itemId?.startsWith('key:')) {
            const [, color] = itemId.split(':');
            return `item-key-${color}`;
        }

        switch (itemId) {
        case 'torch':
            return 'item-torch';
        case 'ore':
            return 'resource-ore';
        case 'wood':
            return 'resource-wood';
        default:
            return 'item-torch';
        }
    }

    spawnEnemies(room) {
        const enemies = (this.runData.enemies ?? []).filter((enemy) => enemy.roomId === room.id);
        enemies.forEach((enemy) => {
            const sprite = this.add.image(tileToWorld(enemy.position.x), tileToWorld(enemy.position.y), 'enemy');
            sprite.setOrigin(0.5);
            this.actorLayer.add(sprite);
            sprite.setData('enemy-data', { ...enemy, health: enemy.health ?? 3 });
            this.setOccupant(enemy.position.x, enemy.position.y, { type: 'enemy', sprite, enemy: sprite.getData('enemy-data') });
            this.enemies.push(sprite);
        });
    }

    spawnEvents(room) {
        const events = (this.runData.events ?? []).filter((event) => event.roomId === room.id);
        events.forEach((event) => {
            const sprite = this.add.image(tileToWorld(event.position.x), tileToWorld(event.position.y), 'event');
            sprite.setOrigin(0.5);
            this.actorLayer.add(sprite);
            this.setOccupant(event.position.x, event.position.y, { type: 'event', sprite, event });
        });
    }

    tryMove(direction) {
        const now = this.time.now;
        if (now - this.lastMoveTime < MOVEMENT_DELAY) {
            return;
        }

        const targetTile = {
            x: this.playerTile.x + direction.x,
            y: this.playerTile.y + direction.y,
        };

        if (!this.isInsideRoom(targetTile)) {
            return;
        }

        const occupant = this.getOccupant(targetTile.x, targetTile.y);
        if (!occupant) {
            this.commitPlayerMove(targetTile);
            return;
        }

        switch (occupant.type) {
        case 'wall':
            return;
        case 'door':
            this.tryDoorInteraction(occupant, targetTile);
            return;
        case 'box': {
            this.tryPushBox(occupant, direction, targetTile);
            return;
        }
        case 'item':
        case 'resource':
        case 'npc':
        case 'enemy':
        case 'switch':
        case 'event':
            // Allow stepping onto interactable items. Interaction resolves afterwards.
            this.commitPlayerMove(targetTile, () => this.handleStepEvent(occupant));
            return;
        default:
            this.commitPlayerMove(targetTile);
        }
    }

    isInsideRoom(tile) {
        const tiles = this.currentRoom.tiles;
        return tile.x >= 0 && tile.y >= 0 && tile.y < tiles.length && tile.x < tiles[0].length;
    }

    commitPlayerMove(tile, postMoveCallback) {
        this.lastMoveTime = this.time.now;
        this.playerTile = { ...tile };
        this.tweens.add({
            targets: this.player,
            duration: MOVEMENT_DELAY,
            x: tileToWorld(tile.x),
            y: tileToWorld(tile.y),
            onComplete: () => {
                if (postMoveCallback) {
                    postMoveCallback();
                }
            },
        });
    }

    tryDoorInteraction(doorOccupant, tile) {
        if (!doorOccupant?.door) {
            return;
        }

        if (!doorOccupant.closed) {
            this.commitPlayerMove(tile, () => this.transitionRoom(doorOccupant.door));
            return;
        }

        const color = doorOccupant.door.color;
        const locks = doorOccupant.door.requiresSwitches ?? [];
        const hasSwitchRequirement = locks.length > 0;
        const unlockedBySwitches = hasSwitchRequirement && locks.every((switchId) => {
            const matching = this.switches.find((entry) => entry.id === switchId);
            return matching?.active;
        });

        if (unlockedBySwitches) {
            this.openDoor(doorOccupant);
            this.commitPlayerMove(tile, () => this.transitionRoom(doorOccupant.door));
            return;
        }

        if (color && this.inventory.useKey(color)) {
            this.openDoor(doorOccupant);
            this.commitPlayerMove(tile, () => this.transitionRoom(doorOccupant.door));
            this.pushStatus(`Used ${color} key.`);
            return;
        }

        this.pushStatus(`Door requires a ${color} key.`);
    }

    openDoor(doorOccupant) {
        doorOccupant.closed = false;
        if (doorOccupant.sprite) {
            doorOccupant.sprite.setTexture('door-opened');
            doorOccupant.sprite.setAlpha(0.6);
        }
        this.setOccupant(doorOccupant.door.position.x, doorOccupant.door.position.y, null);
        const stored = this.doors.get(doorOccupant.door.id);
        if (stored) {
            stored.closed = false;
        }
    }

    transitionRoom(door) {
        if (!door?.leadsTo?.roomId) {
            return;
        }
        this.loadRoom(door.leadsTo.roomId);
        if (door.leadsTo.entry) {
            this.playerTile = { ...door.leadsTo.entry };
            this.player.setPosition(tileToWorld(this.playerTile.x), tileToWorld(this.playerTile.y));
        }
        this.pushStatus(`Entered ${door.leadsTo.roomName ?? door.leadsTo.roomId}.`);
    }

    tryPushBox(boxOccupant, direction, targetTile) {
        const beyondTile = {
            x: targetTile.x + direction.x,
            y: targetTile.y + direction.y,
        };

        if (!this.isInsideRoom(beyondTile)) {
            return;
        }

        const occupant = this.getOccupant(beyondTile.x, beyondTile.y);
        if (occupant) {
            return;
        }

        this.setOccupant(beyondTile.x, beyondTile.y, boxOccupant);
        this.setOccupant(targetTile.x, targetTile.y, null);
        if (boxOccupant.data) {
            boxOccupant.data.position = { ...beyondTile };
        }
        this.tweens.add({
            targets: boxOccupant.sprite,
            duration: MOVEMENT_DELAY,
            x: tileToWorld(beyondTile.x),
            y: tileToWorld(beyondTile.y),
        });

        this.commitPlayerMove(targetTile, () => {
            this.updateSwitches();
        });
    }

    handleStepEvent(occupant) {
        switch (occupant.type) {
        case 'item':
            this.collectItem(occupant);
            break;
        case 'resource':
            this.harvestResource(occupant);
            break;
        case 'npc':
            this.presentDialog(occupant.npc);
            break;
        case 'enemy':
            this.enemyCollision(occupant);
            break;
        case 'event':
            this.triggerEvent(occupant.event);
            break;
        default:
            break;
        }
    }

    handleInteract() {
        const facing = this.playerTile;
        const occupant = this.getOccupant(facing.x, facing.y);
        if (occupant && occupant.type === 'npc') {
            this.presentDialog(occupant.npc, true);
            return;
        }

        const adjacent = this.getAdjacentTiles()
            .map(({ x, y }) => this.getOccupant(x, y))
            .find((entry) => entry && ['npc', 'resource', 'event'].includes(entry.type));

        if (adjacent) {
            this.handleStepEvent(adjacent);
        }
    }

    handleCraft() {
        const craftables = this.crafting.listCraftable();
        if (craftables.length === 0) {
            this.pushStatus('No craftable recipes right now.');
            return;
        }

        const recipe = craftables[0];
        const result = this.crafting.tryCraft(recipe.id);
        if (result.success) {
            this.pushStatus(`Crafted ${recipe.name}.`);
        } else {
            this.pushStatus(result.reason ?? 'Crafting failed.');
        }
    }

    handleAttack() {
        const target = this.getAdjacentTiles()
            .map(({ x, y }) => this.getOccupant(x, y))
            .find((entry) => entry?.type === 'enemy');
        if (!target) {
            this.pushStatus('No enemy in reach.');
            return;
        }

        target.enemy.health -= 1;
        this.tweens.add({
            targets: target.sprite,
            duration: 80,
            alpha: 0.2,
            yoyo: true,
            repeat: 2,
        });
        if (target.enemy.health <= 0) {
            this.pushStatus('Enemy defeated.');
            target.sprite.destroy();
            this.setOccupant(target.enemy.position.x, target.enemy.position.y, null);
        } else {
            this.pushStatus('Hit enemy.');
        }
    }

    updateEnemies() {
        this.enemies.forEach((enemySprite) => {
            const enemyData = enemySprite.getData('enemy-data');
            if (!enemyData || enemyData.health <= 0) {
                return;
            }

            const directions = [
                { x: 0, y: -1 },
                { x: 0, y: 1 },
                { x: -1, y: 0 },
                { x: 1, y: 0 },
            ];
            directions.sort(() => Math.random() - 0.5);

            const move = directions.find((dir) => {
                const candidate = {
                    x: enemyData.position.x + dir.x,
                    y: enemyData.position.y + dir.y,
                };
                if (!this.isInsideRoom(candidate)) {
                    return false;
                }
                if (this.playerTile.x === candidate.x && this.playerTile.y === candidate.y) {
                    return true;
                }
                return !this.getTileOccupant(candidate.x, candidate.y);
            });

            if (!move) {
                return;
            }

            const nextTile = {
                x: enemyData.position.x + move.x,
                y: enemyData.position.y + move.y,
            };

            if (nextTile.x === this.playerTile.x && nextTile.y === this.playerTile.y) {
                this.damagePlayer(1);
                return;
            }

            if (this.getTileOccupant(nextTile.x, nextTile.y)) {
                return;
            }

            const payload = this.getTileOccupant(enemyData.position.x, enemyData.position.y);
            this.setOccupant(enemyData.position.x, enemyData.position.y, null);
            enemyData.position = { ...nextTile };
            if (payload) {
                this.setOccupant(nextTile.x, nextTile.y, payload);
            }

            this.tweens.add({
                targets: enemySprite,
                duration: 180,
                x: tileToWorld(nextTile.x),
                y: tileToWorld(nextTile.y),
            });
        });
    }

    getAdjacentTiles() {
        const { x, y } = this.playerTile;
        return [
            { x, y: y - 1 },
            { x, y: y + 1 },
            { x: x - 1, y },
            { x: x + 1, y },
        ].filter((tile) => this.isInsideRoom(tile));
    }

    harvestResource(occupant) {
        const resource = occupant.resource;
        if (!resource) {
            return;
        }

        this.pushStatus(`Gathered ${resource.resourceId}.`);
        this.inventory.addItem(resource.resourceId, resource.yield ?? 1);
        occupant.sprite.destroy();
        this.setOccupant(resource.position.x, resource.position.y, null);
    }

    collectItem(occupant) {
        const item = occupant.item;
        if (!item) {
            return;
        }

        if (item.itemId?.startsWith('key:')) {
            this.inventory.addKey(item.itemId.split(':')[1]);
            this.pushStatus(`Picked up ${item.itemId.split(':')[1]} key.`);
        } else {
            this.inventory.addItem(item.itemId, item.amount ?? 1);
            this.pushStatus(`Collected ${item.itemId}.`);
        }

        occupant.sprite.destroy();
        this.setOccupant(item.position.x, item.position.y, null);
    }

    presentDialog(npc, forceTrade = false) {
        if (!npc) {
            return;
        }

        this.events.emit('dialog-open', {
            title: npc.name,
            lines: npc.dialog ?? [],
            trade: npc.trade ?? null,
        });

        if (forceTrade && npc.trade && this.inventory.hasItems(npc.trade.requires)) {
            Object.entries(npc.trade.requires).forEach(([itemId, amount]) => {
                this.inventory.removeItem(itemId, amount);
            });

            Object.entries(npc.trade.gives ?? {}).forEach(([itemId, amount]) => {
                if (itemId.startsWith('key:')) {
                    this.inventory.addKey(itemId.split(':')[1]);
                } else {
                    this.inventory.addItem(itemId, amount);
                }
            });

            this.pushStatus(npc.trade.flavor ?? 'Trade complete.');
        }
    }

    enemyCollision(occupant) {
        this.damagePlayer(1);
        this.pushStatus('You collided with a hunter!');
    }

    triggerEvent(event) {
        if (!event) {
            return;
        }
        this.pushStatus(event.summary ?? 'An event unfolds.');
        if (event.type === 'goal') {
            StoryManager.setCurrentRun(this.runData);
            this.events.emit('goal-reached', event);
        }
    }

    damagePlayer(amount) {
        this.health = Math.max(0, this.health - amount);
        this.events.emit('player-health', { health: this.health, maxHealth: this.maxHealth });
        if (this.health <= 0) {
            this.handlePlayerDefeat();
        }
    }

    handlePlayerDefeat() {
        this.pushStatus('The loop collapses. Restart from the title.');
        StoryManager.clearSavedRun();
        this.time.delayedCall(1600, () => {
            this.scene.stop('UIScene');
            this.scene.start('TitleScene');
        });
    }

    handleAttackFeedback(sprite) {
        this.tweens.add({
            targets: sprite,
            duration: 80,
            alpha: 0.3,
            yoyo: true,
            repeat: 2,
        });
    }

    handleInteractFeedback(sprite) {
        this.tweens.add({
            targets: sprite,
            duration: 140,
            scale: 1.2,
            yoyo: true,
        });
    }

    updateSwitches() {
        this.switches.forEach((switchData) => {
            const occupant = this.getOccupant(switchData.position.x, switchData.position.y);
            const active = occupant?.type === 'box';
            if (switchData.active !== active) {
                switchData.active = active;
                switchData.sprite.setTexture(active ? 'tile-switch-on' : 'tile-switch-off');

                const linkedDoor = this.doors.get(switchData.locksDoor);
                if (linkedDoor && active) {
                    const doorOccupant = this.getOccupant(linkedDoor.position.x, linkedDoor.position.y);
                    if (doorOccupant) {
                        this.openDoor(doorOccupant);
                        this.pushStatus('A door slides open in the distance.');
                    }
                }
            }
        });
    }

    updateUI() {
        this.events.emit('player-health', { health: this.health, maxHealth: this.maxHealth });
        this.events.emit('status-update', this.statusMessages.slice(-3));
    }

    pushStatus(message) {
        if (!message) {
            return;
        }
        this.statusMessages.push(message);
        if (this.statusMessages.length > 8) {
            this.statusMessages.shift();
        }
        this.events.emit('status-update', this.statusMessages.slice(-3));
    }

    handleAttackDamage(tile) {
        const occupant = this.getOccupant(tile.x, tile.y);
        if (occupant?.type === 'enemy') {
            occupant.enemy.health -= 1;
            this.handleAttackFeedback(occupant.sprite);
            if (occupant.enemy.health <= 0) {
                occupant.sprite.destroy();
                this.setOccupant(tile.x, tile.y, null);
                this.pushStatus('Enemy defeated.');
            }
        }
    }

    tileKey(x, y) {
        return `${x}:${y}`;
    }

    getTileOccupant(x, y) {
        return this.occupancy.get(this.tileKey(x, y));
    }

    setOccupant(x, y, payload) {
        const key = this.tileKey(x, y);
        if (!payload) {
            this.occupancy.delete(key);
            return;
        }
        if (payload.type === 'enemy') {
            payload.enemy.position = { x, y };
        } else if (payload.type === 'box' && payload.data) {
            payload.data.position = { x, y };
        }
        this.occupancy.set(key, payload);
    }

    getOccupant(x, y) {
        const payload = this.getTileOccupant(x, y);
        if (payload) {
            return payload;
        }
        if (this.playerTile.x === x && this.playerTile.y === y) {
            return { type: 'player' };
        }
        return null;
    }
}
