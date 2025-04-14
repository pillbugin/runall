// Core Electron modules
import { BrowserWindow, app, ipcMain } from 'electron';
import { shell } from 'electron';
// Node.js modules
import { resolve } from 'path';
// PTY for terminal process spawning
import * as pty from 'node-pty';
// Shell-quote safely parses shell commands into argv arrays
import { parse } from 'shell-quote';
// Types and util imports
import type { Arg } from './types';
import { getConfig } from './utils';

// Magic constants injected by Electron Forge (via Webpack) — used to load the correct frontend bundle
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Parsed configs
const [args, cwd] = getConfig();

// Map to track all active terminal instances by unique ID
const instances = new Map<string, pty.IPty>();

// Handle early exit if app was launched by Windows auto-updater (electron-squirrel-startup)
if (require('electron-squirrel-startup')) {
	app.quit();
}

// Create and configure the main browser window
const createWindow = (): void => {
	const mainWindow = new BrowserWindow({
		width: 1024,
		height: 800,
		titleBarStyle: 'hidden', // Remove native titlebar (for custom UI)
		...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}), // Overlay for Win/Linux
		trafficLightPosition: { x: 10, y: 14.5 }, // macOS traffic light button positioning
		webPreferences: {
			contextIsolation: true,
			sandbox: true,
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
		},
	});

	// Expose CLI/config args to renderer
	ipcMain.on('get-args', (event) => {
		event.returnValue = args;
	});

	// Open external links using the OS browser
	ipcMain.on('open-link', (_event, uri) => {
		shell.openExternal(uri);
	});

	// Start a terminal session for a given command
	ipcMain.on('start-terminal', (_event, arg: Arg & { id: string }) => {
		if (instances.has(arg.id)) {
			mainWindow.webContents.send(`running:${arg.id}`);
			return;
		}

		try {
			// Split the command safely (e.g., handling quoted strings)
			const [cmdProgram, ...cmdArgs] = parse(arg.cmd).map((token) => {
				if (typeof token === 'object' && 'op' in token) {
					return token.op;
				}
				return typeof token === 'string' ? token : '';
			});

			// Spawn terminal process
			const term = pty.spawn(cmdProgram, cmdArgs, {
				cwd: resolve(cwd, arg.path),
				env: {
					...process.env,
					RUNALL_ID: arg.id,
				},
			});

			// Send terminal output back to renderer
			term.onData((data) => {
				mainWindow.webContents.send(`output:${arg.id}`, data);
			});

			// Handle input from renderer -> terminal
			ipcMain.on(`input:${arg.id}`, (_event, input) => {
				term.write(input);
			});

			// Handle terminal resizing
			ipcMain.on(`resize:${arg.id}`, (_event, cols, rows) => {
				if (cols && rows && cols > 0 && rows > 0) {
					term.resize(cols, rows);
				}
			});

			// Save instance and notify renderer that it’s running
			instances.set(arg.id, term);
			mainWindow.webContents.send(`running:${arg.id}`);
		} catch (error) {
			console.error(error);
			mainWindow.webContents.send(`error:${arg.id}`, error.message);
		}
	});

	// Stop a terminal session and clean up listeners
	ipcMain.on('stop-terminal', (_event, id) => {
		const term = instances.get(id);
		if (term) {
			term.kill();
			instances.delete(id);

			ipcMain.removeAllListeners(`input:${id}`);
			ipcMain.removeAllListeners(`resize:${id}`);

			mainWindow.webContents.send(`stopped:${id}`);
		}
	});

	// Load frontend UI from bundled entry
	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

	// Optionally open devtools in development mode
	if (process.env.DEVTOOLS) {
		mainWindow.webContents.openDevTools();
	}
};

// Called once Electron is ready — kicks off window creation
app.on('ready', createWindow);

// Standard macOS behavior: keep app open until Cmd+Q
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// macOS: re-open window when clicking dock icon
app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// Prevent navigation from hijacking app behavior (e.g., dropped links)
app.on('web-contents-created', (_event, contents) => {
	contents.on('will-navigate', (event) => {
		event.preventDefault();
	});
});

/**
 * Clean up all terminal processes before quitting the app.
 * Also clears memory and IPC listeners.
 */
function shutdown() {
	for (const term of instances.values()) {
		term.kill();
	}
	instances.clear();
}

// Register graceful shutdown hooks
app.on('quit', shutdown);
process.on('exit', shutdown);
process.on('SIGINT', shutdown);
