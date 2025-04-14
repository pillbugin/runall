// Xterm.js add-ons for features like resizing, searching, and hyperlinks
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';

// Utility libs for colored output and color manipulation
import chalk from 'chalk';
import Color from 'colorjs.io';

// Icons for UI buttons
import { PaintBucketIcon, PlayIcon, SquareIcon } from 'lucide-react';

// React hooks and utilities
import { useEffect, useRef, useState } from 'react';
import { useIntersection, useWindowSize } from 'react-use';

// Types and custom components/hooks
import type { Api } from '../preload';
import { Portal } from './portal';
import { useXtermThemeSync } from './use-xterm-theme-sync';

export type Props = {
	terminals: Api['terminals']; // One or more terminal instances
	portalEl?: React.RefObject<HTMLDivElement>; // Element to mount control buttons into
	sortedColors?: boolean; // Whether to use deterministic color assignment
	setSortedColors?: (value: boolean) => void;
	aggregated?: boolean; // Is this the global “All” terminal?
};

export function Xterm(props: Props) {
	const [tabIsActive, setTabIsActive] = useState(false);
	const [isRunning, setIsRunning] = useState(false);

	// DOM + Xterm instance refs
	const terminalRef = useRef<HTMLDivElement>(null);
	const xtermInstance = useRef<Terminal>(null);
	const fitAddonInstance = useRef<FitAddon>(null);

	// Responsive handling
	const windowSize = useWindowSize();
	const intersection = useIntersection(terminalRef, {
		root: null,
		rootMargin: '0px',
		threshold: 0.1,
	});

	// Sync the terminal’s theme with the app’s current theme
	const theme = useXtermThemeSync(xtermInstance.current);

	// Accent colors used to label output per terminal
	const accentColors = useRef<[string, string][]>([]);

	// Recompute accent colors when theme or terminal list changes
	// biome-ignore lint/correctness/useExhaustiveDependencies(theme): Should refresh accent colors on theme change
	useEffect(() => {
		const colors: [string, string][] = [];
		for (const { idx } of props.terminals) {
			if (props.sortedColors) {
				colors.push(getAccentColors(idx));
			} else {
				colors.push(getAccentColors());
			}
		}
		accentColors.current = colors;
	}, [theme, props.terminals, props.sortedColors]);

	// Initialize terminal and connect it to backend logic
	useEffect(() => {
		const fitAddon = new FitAddon();
		const searchAddon = new SearchAddon();
		const webLinksAddon = new WebLinksAddon((_event, uri) =>
			window.api.openLink(uri),
		);

		const xterm = new Terminal({
			cursorBlink: !props.aggregated,
			disableStdin: props.aggregated,
			cursorStyle: 'underline',
		});

		xterm.loadAddon(fitAddon);
		xterm.loadAddon(searchAddon);
		xterm.loadAddon(webLinksAddon);

		for (const { idx, name, instance } of props.terminals) {
			// Only bind stdin for non-aggregated terminals
			if (!props.aggregated) {
				xterm.onData(instance.input);
			}

			xterm.onResize(instance.resize);

			// Stream stdout
			instance.onOutput((data) => {
				const [accentBg, accentFg] =
					accentColors.current[idx] ?? getAccentColors();
				if (props.aggregated) {
					// Prefix each line with terminal label if in aggregated view
					xterm.write(
						`${chalk.bgHex(accentBg).hex(accentFg).italic(` ${name} `)} `,
					);
				}
				xterm.write(data);
			});

			// Handle start/stop status changes
			instance.onStatusChange((status) => {
				const [accentBg, accentFg] =
					accentColors.current[idx] ?? getAccentColors();
				if (props.aggregated) {
					if (!status) {
						xterm.write(
							`${chalk.bgHex(accentBg).hex(accentFg).italic(` ${name} `)} `,
						);
						xterm.writeln(chalk.bgHex(accentBg).hex(accentFg)(' ⏹ STOPPED '));
					}
				} else {
					setIsRunning(status);
					if (!status) {
						xterm.writeln(chalk.bgHex(accentBg).hex(accentFg)(' ⏹ STOPPED '));
					}
				}
			});

			// Handle terminal error
			instance.onError((message) => {
				const [accentBg, accentFg] =
					accentColors.current[idx] ?? getAccentColors();
				if (props.aggregated) {
					xterm.write(
						`${chalk.bgHex(accentBg).hex(accentFg).italic(` ${name} `)} `,
					);
					xterm.writeln(
						chalk.bgHex(accentBg).hex(accentFg)(` ERROR: ${message} `),
					);
				} else {
					setIsRunning(false);
					xterm.writeln(
						chalk.bgHex(accentBg).hex(accentFg)(` ERROR: ${message} `),
					);
				}
			});

			// Mount the terminal UI into the DOM
			if (terminalRef.current) {
				xterm.open(terminalRef.current);
				// Small delay before starting to avoid race conditions
				setTimeout(() => {
					instance.start();
				}, 500);
			}
		}

		// Prevent text input on aggregated terminals
		if (props.aggregated) {
			xterm.textarea.disabled = true;
		}

		xtermInstance.current = xterm;
		fitAddonInstance.current = fitAddon;

		return () => {
			xterm.dispose();
			xtermInstance.current = null;
		};
	}, [props.terminals, props.aggregated]);

	// Auto-fit terminal when visible
	useEffect(() => {
		const isVisible = !!intersection?.isIntersecting;
		if (isVisible) {
			fitAddonInstance.current?.fit();
		}
		setTabIsActive(isVisible);
	}, [intersection]);

	// Refitting terminal on window resize
	// biome-ignore lint/correctness/useExhaustiveDependencies(windowSize): Should trigger fit on window size change
	useEffect(() => {
		const timeout = setTimeout(() => {
			fitAddonInstance.current?.fit();
		}, 300);
		return () => clearTimeout(timeout);
	}, [windowSize]);

	return (
		<>
			{/* Terminal container */}
			<div
				style={{ backgroundColor: theme?.background }}
				className="rounded-sm p-2 relative size-full"
			>
				<div className="size-full" ref={terminalRef} />
			</div>

			{/* Controls mounted into portal (e.g., bottom bar) */}
			<Portal container={props.portalEl.current}>
				{/* Start/Stop button (only for individual terminals) */}
				{!props.aggregated && tabIsActive && (
					<button
						type="button"
						className="btn btn-circle btn-sm btn-ghost"
						onClick={() => {
							const method = isRunning ? 'stop' : 'start';
							props.terminals[0]?.instance[method]();
						}}
					>
						{isRunning ? <SquareIcon size={16} /> : <PlayIcon size={16} />}
					</button>
				)}

				{/* Color-sorting toggle for the global tab */}
				{props.sortedColors !== undefined &&
					props.setSortedColors !== undefined &&
					tabIsActive && (
						<button
							type="button"
							className={[
								'btn',
								'btn-circle',
								'btn-sm',
								'btn-ghost',
								props.sortedColors ? 'opacity-100' : 'opacity-20',
								'hover:opacity-100',
							]
								.filter(Boolean)
								.join(' ')}
							onClick={() => {
								const newValue = !props.sortedColors;
								props.setSortedColors(newValue);
								window.localStorage.setItem(
									'sortedColors',
									newValue.toString(),
								);
							}}
						>
							<PaintBucketIcon size={16} />
						</button>
					)}
			</Portal>
		</>
	);
}

/**
 * Get a pair of accent colors for the terminal (background, foreground).
 * Uses deterministic colors if `idx` is given, otherwise theme-derived colors.
 */
function getAccentColors(idx?: number): [string, string] {
	if (idx !== undefined) {
		return [tailwindBgHex700[idx] ?? 'bg-black', '#ffffff'];
	}

	const root = document.documentElement;

	const bg = new Color(
		getComputedStyle(root).getPropertyValue('--color-base-content').trim(),
	)
		.to('srgb')
		.toString({ format: 'hex' });

	const fg = new Color(
		getComputedStyle(root).getPropertyValue('--color-base-200').trim(),
	)
		.to('srgb')
		.toString({ format: 'hex' });

	return [bg, fg];
}

// Hardcoded palette for sorted terminal accent colors
const tailwindBgHex700 = [
	'#1d4ed8', // blue-700
	'#0f766e', // teal-700
	'#6d28d9', // violet-700
	'#c2410c', // orange-700
	'#0369a1', // sky-700
	'#a21caf', // fuchsia-700
	'#4d7c0f', // lime-700
	'#4338ca', // indigo-700
	'#be185d', // pink-700
	'#15803d', // green-700
	'#0e7490', // cyan-700
	'#be123c', // rose-700
	'#b45309', // amber-700
	'#6b21a8', // purple-700
	'#047857', // emerald-700
	'#374151', // gray-700
	'#a16207', // yellow-700
	'#b91c1c', // red-700
];
