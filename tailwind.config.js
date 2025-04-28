/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
			'2xl': '1400px'
			}
		},
	  	extend: {
			colors: {
				'penn-blue': '#011F5B',
				'penn-red': '#990000',
				'bright-cyan': '#00B2E3',
				'medium-blue': '#005BBB',
				'penn-purple': '#662D91',
				// Penn Medicine Brand Colors
				brand: {
					'penn-blue': '#011F5B',
					'penn-red': '#990000',
					'bright-cyan': '#00B2E3',
					'medium-blue': '#005BBB',
					'penn-purple': '#662D91',
					// Color scale for Penn Blue
					'50': '#e6eaf0',
					'100': '#b3bdd4',
					'200': '#8090b8',
					'300': '#4d639c',
					'400': '#264283',
					'500': '#011F5B', // Penn Blue
					'600': '#011c52',
					'700': '#011640',
					'800': '#001133',
					'900': '#000b26'
				},
				gray: {
					'750': '#2D3748'
				},
				// HSL Variables for component theming
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				// Chart colors using Penn Medicine palette
				chart: {
					'1': 'hsl(var(--chart-1))', // Penn Blue
					'2': 'hsl(var(--chart-2))', // Bright Cyan
					'3': 'hsl(var(--chart-3))', // Medium Blue
					'4': 'hsl(var(--chart-4))', // Penn Purple
					'5': 'hsl(var(--chart-5))'  // Penn Red
				},
				// Sidebar theming
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
				},
				borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
				},
				keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 }
				}
				},
				animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
				}
			}
		},
		plugins: [require("tailwindcss-animate")],
	}