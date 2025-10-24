# Static Loop

Prototype for a top-down survival + dungeon crawler hybrid built with Phaser 3. Every run starts from a base JSON story that is mutated before the game loads, keeping critical anchors intact while remixing optional NPCs, dialog, and interactables.

## Run Locally

Open `index.html` in a modern browser (Chromium or Firefox recommended). All assets are self-contained and loaded via relative paths and the Phaser CDN.

## Project Layout

```
index.html              # Game bootstrap & Phaser include
src/
  main.js               # Phaser boot configuration
  scenes/
    BootScene.js        # Preloads base story JSON & generates textures
    TitleScene.js       # Start screen + mutation trigger & save resume
    GameScene.js        # Core gameplay (movement, interactions, combat)
    UIScene.js          # HUD, dialog, and status overlays
  system/
    StoryManager.js     # Base JSON loader, mutation orchestration, saves
    storyMutation.js    # Placeholder mutation logic for procedurally tweaking JSON
    Inventory.js        # Inventory state & key tracking
    CraftingSystem.js   # Recipe validation and crafting execution
data/
  baseStory.json        # Base story graph with rooms, NPCs, objects, events
```

## Core Loop Highlights

- **Grid traversal** on 16×16 tiles with pushable crates, colored doors, and switches.
- **Survival systems** for gathering, crafting, and trading resources.
- **Dungeon mechanics** including keys, switches, and enemy patrols.
- **Dialog & trading** with NPCs using story-driven text snippets.
- **Procedural mutation** that tweaks optional content each run while keeping lore anchors intact.
- **Local saves** stored in `localStorage` so players can resume the latest run from the title screen.

Extend the placeholder mutation rules in `src/system/storyMutation.js` to hook up a real LLM-backed generator when ready.
