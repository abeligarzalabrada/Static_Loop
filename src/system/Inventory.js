const Phaser = window.Phaser;

export default class Inventory extends Phaser.Events.EventEmitter {
    constructor() {
        super();
        this.items = {};
        this.keys = {};
    }

    addItem(itemId, amount = 1) {
        if (!itemId) {
            return;
        }
        this.items[itemId] = (this.items[itemId] ?? 0) + amount;
        this.emit('changed', this.snapshot());
    }

    removeItem(itemId, amount = 1) {
        if (!itemId || !this.items[itemId]) {
            return false;
        }
        this.items[itemId] -= amount;
        if (this.items[itemId] <= 0) {
            delete this.items[itemId];
        }
        this.emit('changed', this.snapshot());
        return true;
    }

    addKey(color) {
        if (!color) {
            return;
        }
        this.keys[color] = (this.keys[color] ?? 0) + 1;
        this.emit('changed', this.snapshot());
    }

    hasKey(color) {
        return (this.keys[color] ?? 0) > 0;
    }

    useKey(color) {
        if (!this.hasKey(color)) {
            return false;
        }
        this.keys[color] -= 1;
        if (this.keys[color] <= 0) {
            delete this.keys[color];
        }
        this.emit('changed', this.snapshot());
        return true;
    }

    hasItems(requirements) {
        return Object.entries(requirements ?? {}).every(([item, amount]) => {
            return (this.items[item] ?? 0) >= amount;
        });
    }

    applyDelta(delta) {
        Object.entries(delta ?? {}).forEach(([item, amount]) => {
            if (amount > 0) {
                this.addItem(item, amount);
            } else {
                this.removeItem(item, Math.abs(amount));
            }
        });
    }

    snapshot() {
        return {
            items: { ...this.items },
            keys: { ...this.keys },
        };
    }
}
