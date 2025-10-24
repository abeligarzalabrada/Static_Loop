import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(ROOT_DIR, { dotfiles: 'ignore' }));

let model = null;

if (GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
} else {
    console.warn('[server] GEMINI_API_KEY not set. AI endpoint disabled.');
}

function buildPrompt(baseStory) {
    return `You are an expert narrative designer updating procedural dungeon crawl data.
Return strictly minified JSON that extends the provided base story while obeying these rules:
- Preserve every entry with \\"flags.mustExistInBase\\".
- Maintain object identifiers already present.
- You may add up to 3 new NPCs, items, or events but keep loop tone consistent (retro sci-fi survival).
- Mutate optional dialog using the supplied snippet pools.
- Ensure rooms remain 16x16 tiles if you add or edit.
- Keep crafting recipes valid and balanced.
- Always return a valid JSON object matching the schema of the input base story. Do not wrap in markdown.`;
}

function extractJsonFromText(text) {
    if (!text) {
        return null;
    }

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
        return null;
    }

    try {
        const jsonSlice = text.slice(firstBrace, lastBrace + 1);
        return JSON.parse(jsonSlice);
    } catch (error) {
        console.warn('[server] Failed to parse AI JSON', error);
        return null;
    }
}

app.post('/api/mutate-story', async (req, res) => {
    if (!model) {
        res.status(503).json({ error: 'AI model unavailable. Configure GEMINI_API_KEY.' });
        return;
    }

    const baseStory = req.body?.baseStory;
    if (!baseStory) {
        res.status(400).json({ error: 'Missing baseStory payload.' });
        return;
    }

    try {
        const prompt = buildPrompt(baseStory);
        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { text: `\nBase story JSON:\n${JSON.stringify(baseStory)}` },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.8,
                topP: 0.9,
                maxOutputTokens: 2048,
            },
        });

        const text = result?.response?.text?.();
        const story = extractJsonFromText(text);

        if (!story) {
            res.status(502).json({ error: 'AI response invalid or empty.' });
            return;
        }

        res.json({ story });
    } catch (error) {
        console.error('[server] AI mutation failed', error);
        res.status(500).json({ error: 'Failed to mutate story.' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Static Loop server running on http://localhost:${PORT}`);
});
