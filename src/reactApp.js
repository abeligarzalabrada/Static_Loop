import React from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import GameShell from './ui/GameShell.js';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('React root element not found');
}

const root = createRoot(rootElement);
root.render(
    React.createElement(
        React.StrictMode,
        null,
        React.createElement(GameShell, null)
    )
);
