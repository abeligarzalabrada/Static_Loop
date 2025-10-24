import mutateStory from './storyMutation.js';

const localStorageKey = 'static-loop:last-run';

let baseStory = null;
let currentRun = null;

function cloneStory(data) {
    try {
        return JSON.parse(JSON.stringify(data));
    } catch (error) {
        console.warn('[StoryManager] Failed to clone  data', error);
        return null;
    }
}

function getMustExistChecks(source) {
    const checks = [];

    if (!source) {
        return checks;
    }

    const forceList = (list, type) => {
        (list ?? []).forEach((entry) => {
            if (entry?.flags?.mustExistInBase) {
                checks.push({ type, id: entry.id });
            }
        });
    };

    forceList(source.npcs, 'npc');
    forceList(source.rooms, 'room');
    forceList(source.objects, 'object');
    forceList(source.events, 'event');

    return checks;
}

function validateRun(mutated, checks) {
    if (!mutated || typeof mutated !== 'object') {
        return false;
    }

    if (!mutated.baseHistory || !mutated.baseHistory.title) {
        return false;
    }

    return checks.every((spec) => {
        const list = mutated[`${spec.type}s`];
        if (!Array.isArray(list)) {
            return false;
        }

        return list.some((entry) => entry.id === spec.id);
    });
}

function safeSave(run) {
    try {
        window.localStorage.setItem(localStorageKey, JSON.stringify(run));
    } catch (error) {
        console.warn('[StoryManager] Unable to write save data', error);
    }
}

const StoryManager = {
    setBaseStory(data) {
        baseStory = cloneStory(data);
        if (!currentRun) {
            currentRun = cloneStory(baseStory);
        }
    },

    getBaseStory() {
        return cloneStory(baseStory);
    },

    async buildRun() {
        if (!baseStory) {
            throw new Error('Base story not loaded');
        }

        const checks = getMustExistChecks(baseStory);
        const mutated = await mutateStory(cloneStory(baseStory));
        const valid = validateRun(mutated, checks);
        currentRun = valid ? mutated : cloneStory(baseStory);

        if (!valid) {
            console.warn('[StoryManager] Mutation invalid. Falling back to base story.');
        }

        safeSave(currentRun);
        return cloneStory(currentRun);
    },

    setCurrentRun(data) {
        currentRun = cloneStory(data);
        safeSave(currentRun);
    },

    getCurrentRun() {
        if (currentRun) {
            return cloneStory(currentRun);
        }

        return cloneStory(baseStory);
    },

    hasSavedRun() {
        try {
            return window.localStorage.getItem(localStorageKey) !== null;
        } catch (error) {
            console.warn('[StoryManager] LocalStorage unavailable', error);
            return false;
        }
    },

    loadSavedRun() {
        try {
            const raw = window.localStorage.getItem(localStorageKey);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn('[StoryManager] Failed to read saved run', error);
            return null;
        }
    },

    clearSavedRun() {
        try {
            window.localStorage.removeItem(localStorageKey);
        } catch (error) {
            console.warn('[StoryManager] Failed to clear saved run', error);
        }
    },
};

export default StoryManager;
