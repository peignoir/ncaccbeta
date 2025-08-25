/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./index.html',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		extend: {
			colors: {
				primary: '#3b82f6',
				adventure: '#e11d48',
				side: '#16a34a',
				lifestyle: '#f59e0b',
				karma: '#7c3aed',
			},
			borderRadius: {
				md: '10px',
			},
		},
	},
	plugins: [],
}


