/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./context/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Cairo', 'sans-serif'],
            },
            fontSize: {
                '3xs': '8px',
                '2xs': '10px',
                'xs': '12px',
                'sm': '14px',
                'base': '16px',
                'lg': '18px',
                'xl': '20px',
                '2xl': '24px',
                '3xl': '30px',
                '4xl': '36px',
                '5xl': '48px',
            },
            colors: {
                primary: '#1e40af', // blue-800
                secondary: '#f59e0b', // amber-500
                background: '#f3f4f6', // gray-100
            },
            boxShadow: {
                'premium': 'var(--shadow-premium)',
                'lux': 'var(--shadow-lux)',
                'card-deep': 'var(--shadow-card)',
            }
        },
    },
    plugins: [],
}
