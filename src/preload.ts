// Import Electron's context isolation and IPC modules
import { contextBridge, ipcRenderer } from 'electron';
import type { Arg } from './types';

/**
 * Creates a terminal instance wrapper tied to a specific ID and config.
 * Handles IPC communication between the renderer and main process for:
 * - Starting/stopping the command
 * - Receiving output/error
 * - Sending input or resizing
 * - Watching running status
 */
const createInstance = (id: string, config: Arg) => {
	let isRunning = false;

	return {
		start: () => {
			if (!isRunning) {
				ipcRenderer.send('start-terminal', { id, ...config });
			}
		},
		stop: () => {
			if (isRunning) {
				ipcRenderer.send('stop-terminal', id);
			}
		},
		// Listen for status change events (running/stopped)
		onStatusChange: (cb: (running: boolean) => void) => {
			ipcRenderer.on(`running:${id}`, () => {
				cb(true);
				isRunning = true;
			});
			ipcRenderer.on(`stopped:${id}`, () => {
				cb(false);
				isRunning = false;
			});
		},
		// Listen for output data (stdout)
		onOutput: (cb: (data: string) => void) => {
			ipcRenderer.on(`output:${id}`, (_event, data) => cb(data));
		},
		// Listen for error messages (stderr or terminal issues)
		onError: (cb: (error: string) => void) => {
			ipcRenderer.on(`error:${id}`, (_event, error) => cb(error));
		},
		// Send input back to the terminal (like typing into stdin)
		input: (data: string) => {
			ipcRenderer.send(`input:${id}`, data);
		},
		// Resize the terminal window (columns/rows)
		resize: (data: { cols: number; rows: number }) => {
			ipcRenderer.send(`resize:${id}`, data);
		},
	};
};

// Get command args from the main process synchronously
const args = ipcRenderer.sendSync('get-args') as Arg[];

// For each command, create a terminal instance with a unique ID and metadata
const terminals = args.map((arg, idx) => {
	const id = `${idx}-${arg.path}-${arg.cmd}`;
	const name = arg.name ?? `${arg.path} ${arg.cmd}`;
	const instance = createInstance(id, arg);

	return { ...arg, idx, id, name, instance };
});

// Allows renderer to request the system to open external links
const openLink = (uri: string) => {
	ipcRenderer.send('open-link', uri);
};

// Public API exposed to the renderer
const api = { terminals, openLink };

// Expose the API via Electron’s contextBridge
contextBridge.exposeInMainWorld('api', api);

// Export type for safe typing in renderer code
export type Api = typeof api;
