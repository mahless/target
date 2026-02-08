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
            colors: {
                primary: '#1e40af', // blue-800
                secondary: '#f59e0b', // amber-500
                background: '#f3f4f6', // gray-100
            }
        },
    },
    plugins: [],
}
