# Characters Directory

This folder stores per-NPC reference sheets that describe how to render each 8-bit survivor, how their trades work, and what JSON nodes feed their dialogue. The files here are meant for designers, artists, and the future AI-driven story mutator.

Each sheet lists:

- **sourceId** – matches the `id` field inside `data/baseStory.json`.
- **dialogSource** – path to the base JSON dialogue block used by the story mutator.
- **sprite** – 8-bit rendering guidelines (16×16 tiles, palette callouts, animation beats).
- **trade** – canonical barter rules so procedural systems keep core deals consistent.
- **behavior** – quick notes for in-game scripting.

When mutating story data, keep the items flagged with `mustExistInBase` untouched, and respect the contracts documented here so trading and quest logic stays coherent.
