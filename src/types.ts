// Import the API type definition from the Electron preload script
import type { Api } from './preload';

/**
 * Represents a command definition.
 * - `path`: Working directory where the command will be executed
 * - `cmd`: The actual shell command to run
 * - `name` (optional): A label to display in the UI tab
 */
export type Arg = {
	name?: string;
	path: string;
	cmd: string;
};

// Extend the global `window` object to include the preload API.
// This allows safe access to Electron's `contextBridge` exposed methods in the renderer.
declare global {
	interface Window {
		api: Api;
	}
}
