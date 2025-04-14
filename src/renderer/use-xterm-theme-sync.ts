import type { ITheme, Terminal } from '@xterm/xterm';
import { useEffect, useState } from 'react';

/**
 * Syncs the Xterm.js terminal theme with the current CSS theme.
 * Reactively updates when the `data-theme` attribute changes (e.g., on theme switch).
 */
export function useXtermThemeSync(term: Terminal | null) {
	// Store the current applied Xterm theme (for external use)
	const [state, setState] = useState<ITheme | undefined>();

	useEffect(() => {
		// Exit early if no terminal is available yet
		if (!term) return;

		const root = document.documentElement;

		/**
		 * Helper to extract a CSS variable, falling back to a default if not found.
		 */
		const getColor = (varName: string, fallback: string): string => {
			return (
				getComputedStyle(root).getPropertyValue(varName)?.trim() || fallback
			);
		};

		/**
		 * Build a theme object using current CSS custom properties and apply it to the terminal.
		 */
		const updateTheme = () => {
			const theme: ITheme = {
				background: getColor('--color-base-200', '#ffffff'),
				foreground: getColor('--color-base-content', '#1f2937'),
				cursor: getColor('--color-base-content', '#1f2937'),
				selectionBackground: getColor('--color-base-300', '#93c5fd44'),
				selectionForeground: getColor('--color-base-content', '#1f2937'),
				selectionInactiveBackground: getColor('--color-base-300', '#1f2937'),
			};

			// Apply the theme to the terminal
			term.options.theme = theme;

			// Save the theme to state
			setState(theme);
		};

		// Apply the theme initially
		updateTheme();

		// Watch for theme changes via mutation on `data-theme` attribute
		const observer = new MutationObserver(updateTheme);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme'],
		});

		// Cleanup: disconnect observer when component unmounts or term changes
		return () => observer.disconnect();
	}, [term]);

	return state;
}
