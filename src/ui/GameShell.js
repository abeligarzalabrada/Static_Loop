import React, { useCallback, useEffect, useRef, useState } from 'https://esm.sh/react@18.3.1';
import { GAME_WIDTH, GAME_HEIGHT, createGame, destroyGame } from '../main.js';

const RESIZE_THROTTLE_MS = 120;
const h = React.createElement;

function throttle(fn, delay) {
    let ticking = false;

    return (...args) => {
        if (ticking) {
            return;
        }

        ticking = true;
        window.setTimeout(() => {
            ticking = false;
            fn(...args);
        }, delay);
    };
}

const fullscreenAvailable = () => {
    const element = document.documentElement;
    return !!(
        document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        element.requestFullscreen ||
        element.webkitRequestFullscreen ||
        element.msRequestFullscreen
    );
};

export default function GameShell() {
    const containerRef = useRef(null);
    const gameRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [touchSupported, setTouchSupported] = useState(false);

    const applyScale = useCallback(() => {
        const game = gameRef.current;
        if (!game) {
            return;
        }

        game.scale.refresh();
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }

        const host = document.createElement('div');
        host.className = 'game-shell__canvas-host';
    container.appendChild(host);

        const game = createGame(host);
        gameRef.current = game;

        const throttledResize = throttle(() => applyScale(), RESIZE_THROTTLE_MS);
        const observer = new ResizeObserver(throttledResize);
        observer.observe(host);

        const windowResize = throttle(() => applyScale(), RESIZE_THROTTLE_MS);
        window.addEventListener('resize', windowResize);
        window.addEventListener('orientationchange', windowResize);

        applyScale();

        const fullscreenListener = () => {
            const active = !!(document.fullscreenElement || document.webkitFullscreenElement);
            setIsFullscreen(active);
            window.requestAnimationFrame(() => applyScale());
        };
        document.addEventListener('fullscreenchange', fullscreenListener);
        document.addEventListener('webkitfullscreenchange', fullscreenListener);

    const touchCapable = 'ontouchstart' in window || (navigator?.maxTouchPoints ?? 0) > 0;
    setTouchSupported(touchCapable);

        return () => {
            document.removeEventListener('fullscreenchange', fullscreenListener);
            document.removeEventListener('webkitfullscreenchange', fullscreenListener);
            window.removeEventListener('resize', windowResize);
            window.removeEventListener('orientationchange', windowResize);
            observer.disconnect();

            if (gameRef.current) {
                destroyGame(gameRef.current);
                gameRef.current = null;
            }

            if (host.parentElement) {
                host.parentElement.removeChild(host);
            }
        };
    }, [applyScale]);

    const toggleFullscreen = useCallback(() => {
        if (!fullscreenAvailable()) {
            return;
        }

        const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
        const enter =
            document.documentElement.requestFullscreen ||
            document.documentElement.webkitRequestFullscreen ||
            document.documentElement.msRequestFullscreen;

        if (document.fullscreenElement || document.webkitFullscreenElement) {
            exit?.call(document);
        } else {
            enter?.call(document.documentElement);
        }
    }, []);

    const canFullscreen = fullscreenAvailable();
    const fullscreenButton = canFullscreen
        ? h(
            'button',
            {
                type: 'button',
                className: 'game-shell__button',
                onClick: toggleFullscreen,
            },
            isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'
        )
        : null;

    const touchHint = touchSupported
        ? h('span', { className: 'game-shell__hint' }, 'Toque para interactuar')
        : null;

    return h(
        'div',
        { className: 'game-shell' },
        h(
            'div',
            { ref: containerRef, className: 'game-shell__viewport' },
            h('div', { className: 'game-shell__overlay' }, fullscreenButton, touchHint)
        )
    );
}
