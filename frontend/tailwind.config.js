/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#0ddff2',
                    hover: '#0bc5d6',
                    light: '#e0f7fa',
                },
                surface: {
                    DEFAULT: '#ffffff',
                    dark: '#1e293b',
                },
                success: '#22c55e',
                warning: '#f59e0b',
                error: '#ef4444',
            },
            fontFamily: {
                heading: ['Lexend', 'sans-serif'],
                body: ['Public Sans', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '0.5rem',
            },
            boxShadow: {
                card: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            },
        },
    },
    plugins: [],
};
