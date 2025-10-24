# Static Loop

Prototype for a top-down survival + dungeon crawler hybrid built with Phaser 3. Every run starts from a base JSON story that is mutated before the game loads, keeping critical anchors intact while remixing optional NPCs, dialog, and interactables.

## Run Locally

### Prerequisites

- Node.js 18 or newer (for the Express server + Gemini proxy)
- npm (or a compatible package manager)
- Optional: Python 3.12+ if you need to regenerate sprite PNGs

### Quick Start

```bash
npm install
npm run dev
```

The Express server serves the static build from the project root and exposes `/api/mutate-story` as a Gemini-backed mutation endpoint. Visit [http://localhost:3000](http://localhost:3000) once the server is running.

### AI Mutation Flow (Optional)

1. Populate `.env` with your Gemini credentials if you want AI-enhanced mutations:
   ```env
   GEMINI_API_KEY=your_api_key_here
   GEMINI_MODEL=gemini-1.5-flash
   ```
2. Start the server via `npm run dev`.
3. From the title screen select **Start New Run**. The game uses procedural mutation by default; AI is a bonus if available.

If no AI key is provided, the game uses procedural fallback automatically.

## Responsive Shell

The legacy static container has been replaced with a lightweight React shell (`src/reactApp.js`). It centres the Phaser canvas, preserves the original 16:9 aspect, and scales to the available viewport using the current `devicePixelRatio` to keep pixels crisp on retina hardware. A "Pantalla completa" toggle is always available and touch devices display a hint overlay.

### Resize Guarantees

- Desktop breakpoints (1024×768, 1366×768, 1920×1080) maintain centred letterboxing without stretching sprites.
- Mobile/tablet orientations fill the usable viewport while preserving input hitboxes.
- Fullscreen (`F11` or button) reflows instantly without impacting keyboard/mouse/touch controls.
- Resize listeners are throttled (~120 ms) to avoid layout thrash and keep frame times steady.

## Project Layout

```
index.html              # React host + Phaser CDN include
package.json            # Express + Gemini proxy dependencies
server/index.js         # API proxy for /api/mutate-story and static hosting
src/
  main.js               # Phaser boot configuration exported for React
  reactApp.js           # React entry-point
  ui/GameShell.js       # Responsive canvas wrapper + fullscreen controls
  scenes/
    BootScene.js        # Preloads base story JSON & generated textures
    TitleScene.js       # Start screen + mutation trigger & save resume
    GameScene.js        # Core gameplay (movement, interactions, combat)
    UIScene.js          # HUD, dialog, and status overlays
  system/
    StoryManager.js     # Base JSON loader, mutation orchestration, saves
    storyMutation.js    # AI-first mutation flow with procedural fallback
    Inventory.js        # Inventory state & key tracking
    CraftingSystem.js   # Recipe validation and crafting execution
data/
  baseStory.json        # Base story graph with rooms, NPCs, objects, events
assets/
  ...                   # Generated 8-bit sprites, tiles, HUD textures
```

## Verifying the Experience

- **Desktop:** Resize the window across common breakpoints; sprites remain sharp and centred.
- **Mobile/tablet:** Use device emulation to confirm the canvas fills the viewport and touch input is recognised.
- **Fullscreen:** Toggle via the UI button or `F11`; gameplay continues smoothly.
- **High DPI:** Inspect the canvas on a retina display—the resolution multiplier maintains crisp edges.
- **AI fallback:** Temporarily remove the Gemini key or stop the server; the procedural mutation path still produces valid runs.

## Asset Generation

Regenerate character, tile, and UI sprites from `tools/generate_sprites.py` once the Python virtualenv is active:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install Pillow
python tools/generate_sprites.py
```

The script writes updated PNGs into `assets/characters`, `assets/tiles`, `assets/items`, and `assets/ui`.
