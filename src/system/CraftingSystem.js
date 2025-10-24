const Phaser = window.Phaser;

export default class CraftingSystem extends Phaser.Events.EventEmitter {
    constructor(inventory, recipes = []) {
        super();
        this.inventory = inventory;
        this.recipes = recipes;
    }

    setRecipes(recipes) {
        this.recipes = Array.isArray(recipes) ? recipes : [];
        this.emit('recipes-updated', this.recipes);
    }

    listCraftable() {
        return this.recipes.filter((recipe) => this.inventory.hasItems(recipe.requires));
    }

    tryCraft(recipeId) {
        const recipe = this.recipes.find((entry) => entry.id === recipeId);
        if (!recipe) {
            return { success: false, reason: 'Recipe not known.' };
        }

        if (!this.inventory.hasItems(recipe.requires)) {
            return { success: false, reason: 'Missing ingredients.' };
        }

        Object.entries(recipe.requires).forEach(([itemId, amount]) => {
            this.inventory.removeItem(itemId, amount);
        });

        Object.entries(recipe.produces ?? {}).forEach(([itemId, amount]) => {
            if (itemId.startsWith('key:')) {
                this.inventory.addKey(itemId.split(':')[1]);
            } else {
                this.inventory.addItem(itemId, amount);
            }
        });

        this.emit('crafted', recipe);
        return { success: true, recipe };
    }
}
