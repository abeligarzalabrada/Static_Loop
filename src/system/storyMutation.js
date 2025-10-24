const random = {
    pick(list, fallback) {
        if (!Array.isArray(list) || list.length === 0) {
            return fallback;
        }
        const index = Math.floor(Math.random() * list.length);
        return list[index];
    },
    range(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
};

function getRoomById(rooms, roomId) {
    return rooms?.find((room) => room.id === roomId) ?? null;
}

function randomFloorPosition(room) {
    if (!room || !Array.isArray(room.tiles) || room.tiles.length === 0) {
        return { x: 1, y: 1 };
    }

    const height = room.tiles.length;
    const width = room.tiles[0].length;

    for (let attempt = 0; attempt < 24; attempt += 1) {
        const x = random.range(1, Math.max(1, width - 2));
        const y = random.range(1, Math.max(1, height - 2));
        const tile = room.tiles[y]?.[x];
        if (tile && tile !== 'W') {
            return { x, y };
        }
    }

    return { x: 1, y: 1 };
}

function remixDialog(baseLines = [], snippets = []) {
    const lines = [...baseLines];

    if (snippets.length === 0) {
        return lines;
    }

    const extraCount = random.range(1, Math.min(3, snippets.length));
    for (let i = 0; i < extraCount; i += 1) {
        const snippet = random.pick(snippets);
        if (snippet && !lines.includes(snippet)) {
            lines.push(snippet);
        }
    }

    return lines;
}

function mutateNPCs(npcs = [], dialogSnippets, rooms = []) {
    return npcs.map((npc) => {
        if (npc?.flags?.mustExistInBase) {
            return npc;
        }

        const mutated = { ...npc };
        const descriptor = random.pick(dialogSnippets?.npcDescriptors ?? []);
        const mood = random.pick(dialogSnippets?.npcMoods ?? []);
        if (descriptor && mood) {
            mutated.name = `${descriptor} ${npc.baseName ?? npc.name ?? 'Wanderer'}`;
            mutated.title = mood;
        }

        mutated.dialog = remixDialog(
            npc.dialog,
            dialogSnippets?.npcDialogue ?? []
        );

        if (mutated.trade && Math.random() > 0.6) {
            // Swap trade terms to keep runs fresh.
            mutated.trade = {
                gives: npc.trade.requires,
                requires: npc.trade.gives,
                flavor: random.pick(dialogSnippets?.tradeFlavors ?? [], npc.trade?.flavor ?? ''),
            };
        }

        // Random chance to move NPC to another non-critical room.
        if (npc.roamRooms && npc.roamRooms.length > 0) {
            const targetRoom = random.pick(npc.roamRooms, npc.roomId);
            mutated.roomId = targetRoom ?? npc.roomId;
            const room = getRoomById(rooms, mutated.roomId);
            if (room) {
                mutated.position = randomFloorPosition(room);
            }
        }

        return mutated;
    });
}

function mutateObjects(objects = [], rooms = [], dialogSnippets) {
    const walkableRooms = rooms.filter((room) => !room.flags?.mustExistInBase);

    return objects.map((object) => {
        if (object?.flags?.mustExistInBase) {
            return object;
        }

        const mutated = { ...object };

        if (object.type === 'resource' && walkableRooms.length > 0) {
            const targetRoom = random.pick(walkableRooms, object.roomId);
            mutated.roomId = targetRoom.id;
            mutated.position = randomFloorPosition(targetRoom);
        }

        if (object.type === 'item' && /key:/.test(object.itemId)) {
            mutated.flavor = random.pick(dialogSnippets?.itemFlavors ?? [], object.flavor);
        } else if (object.type === 'item' && walkableRooms.length > 0 && Math.random() > 0.5) {
            const targetRoom = random.pick(walkableRooms, object.roomId);
            mutated.roomId = targetRoom.id;
            mutated.position = randomFloorPosition(targetRoom);
        }

        return mutated;
    });
}

function mutateEvents(events = [], dialogSnippets) {
    return events.map((event) => {
        if (event?.flags?.mustExistInBase) {
            return event;
        }

        const mutated = { ...event };
        if (event.type === 'lore') {
            mutated.summary = random.pick(dialogSnippets?.loreHooks ?? [], event.summary);
        }
        if (event.type === 'goal') {
            mutated.reward = random.pick(dialogSnippets?.goalRewards ?? [], event.reward);
        }
        return mutated;
    });
}

function mutateRooms(rooms = [], dialogSnippets) {
    return rooms.map((room) => {
        if (room?.flags?.mustExistInBase) {
            return room;
        }

        const mutated = { ...room };
        if (Array.isArray(room.puzzleVariants) && room.puzzleVariants.length > 0) {
            const variant = random.pick(room.puzzleVariants, null);
            if (variant) {
                mutated.tiles = variant.tiles;
                mutated.puzzleHint = random.pick(dialogSnippets?.puzzleHints ?? [], variant.hint ?? room.puzzleHint);
            }
        }

        if (room.ambientDialog && dialogSnippets?.ambientWhispers?.length > 0) {
            mutated.ambientDialog = random.pick(dialogSnippets.ambientWhispers);
        }

        return mutated;
    });
}

async function callAiMutation(baseStory) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch('/api/mutate-story', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ baseStory }),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`AI endpoint returned ${response.status}`);
        }

        const payload = await response.json();
        if (payload?.story && typeof payload.story === 'object') {
            return payload.story;
        }

        throw new Error('AI response missing story payload');
    } catch (error) {
        console.warn('[storyMutation] AI mutation fallback engaged', error);
        return null;
    } finally {
        window.clearTimeout(timeout);
    }
}

function proceduralMutation(baseStory) {
    if (!baseStory) {
        return null;
    }

    const dialogSnippets = baseStory.dialogSnippets ?? {};

    const mutated = {
        ...baseStory,
        meta: {
            ...(baseStory.meta ?? {}),
            generatedAt: new Date().toISOString(),
            seed: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            source: 'procedural-fallback',
        },
    };

    mutated.npcs = mutateNPCs(baseStory.npcs, dialogSnippets, baseStory.rooms);
    mutated.objects = mutateObjects(baseStory.objects, baseStory.rooms, dialogSnippets);
    mutated.events = mutateEvents(baseStory.events, dialogSnippets);
    mutated.rooms = mutateRooms(baseStory.rooms, dialogSnippets);

    return mutated;
}

export default async function mutateStory(baseStory) {
    if (!baseStory) {
        return null;
    }

    const aiStory = await callAiMutation(baseStory);
    if (aiStory) {
        return aiStory;
    }

    return proceduralMutation(baseStory);
}
