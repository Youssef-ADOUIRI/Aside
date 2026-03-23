import { useState, useEffect, createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
    bg: string;
    text: string;
    textMuted: string;
    textFaint: string;
    placeholder: string;
    separator: string;
    overlay: string;
    card: string;
    dotActive: string;
    dotInactive: string;
    accent: string;
}

const LIGHT: ThemeColors = {
    bg: '#FFFFFF',
    text: '#000000',
    textMuted: '#999999',
    textFaint: '#CCCCCC',
    placeholder: '#A0A0A0',
    separator: '#F0F0F0',
    overlay: 'rgba(0,0,0,0.15)',
    card: '#FFFFFF',
    dotActive: '#999999',
    dotInactive: '#DDDDDD',
    accent: '#FF5555',
};

const DARK: ThemeColors = {
    bg: '#1A1A1A',
    text: '#E8E8E8',
    textMuted: '#777777',
    textFaint: '#444444',
    placeholder: '#555555',
    separator: '#2A2A2A',
    overlay: 'rgba(0,0,0,0.4)',
    card: '#242424',
    dotActive: '#888888',
    dotInactive: '#3A3A3A',
    accent: '#FF6666',
};

const STORAGE_KEY = 'aside_theme';

export function useTheme() {
    const [mode, setMode] = useState<ThemeMode>('light');

    // Load saved preference
    useEffect(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (saved === 'dark' || saved === 'light') {
                setMode(saved);
            }
        }
    }, []);

    const toggle = () => {
        const next: ThemeMode = mode === 'light' ? 'dark' : 'light';
        setMode(next);
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(STORAGE_KEY, next);
        }
    };

    const colors = mode === 'dark' ? DARK : LIGHT;

    return { mode, toggle, colors };
}
