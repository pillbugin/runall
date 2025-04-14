// Node and Electron imports
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { app, dialog } from 'electron';

// Type imports and external libs
import type { Arg } from './types';
import yaml from 'yaml';
import yargs from 'yargs';

/**
 * Show an error dialog and quit the app.
 * Used for any fatal error cases (e.g., bad config, invalid args).
 */
export function abort(message: string) {
	dialog.showErrorBox('Something went wrong', message);
	app.quit();
}

/**
 * Determines which config file to use based on CLI flags or default paths.
 * Priority:
 * 1. --config / -c flag
 * 2. run.config.yaml
 * 3. run.config.yml
 * 4. run.config.json
 */
const getConfigPath = (argv: yargs.Arguments, cwd: string) => {
	const configFromFlag = argv.config ?? argv.c;
	if (configFromFlag) {
		const fromFlagResolved = resolve(cwd, configFromFlag.toString());
		if (existsSync(fromFlagResolved)) {
			return fromFlagResolved;
		}
	}

	const defaultYaml = resolve(cwd, './run.config.yaml');
	if (existsSync(defaultYaml)) return defaultYaml;

	const defaultYml = resolve(cwd, './run.config.yml');
	if (existsSync(defaultYml)) return defaultYml;

	const defaultJson = resolve(cwd, './run.config.json');
	if (existsSync(defaultJson)) return defaultJson;

	// No config file found
	return undefined;
};

/**
 * Parses and returns a list of Arg objects from CLI or config file.
 *
 * Supports two input modes:
 * 1. Inline CLI args: `apps/web@"npm run dev"`
 * 2. Config file: YAML or JSON
 */
export function getArgs() {
	// Parse CLI args using yargs, slicing extra args if run via electron
	const argv = yargs(process.argv.slice(process.defaultApp ? 2 : 1))
		.argv as yargs.Arguments;

	// Try parsing inline CLI-style args first
	const fromProcess = argv._.map<Arg>((arg) => {
		const parts = arg.toString().split('@');
		let path = parts[0];
		let cmd = parts[1];

		// Validate format
		if (!path || !cmd) {
			abort(`Invalid argument: ${arg}`);
		}

		// Strip quotes around values if present
		if (path.match(/^'(.+)'$/) || path.match(/^"(.+)"$/)) {
			path = path.slice(1, -1);
		}

		if (cmd.match(/^'(.+)'$/) || cmd.match(/^"(.+)"$/)) {
			cmd = cmd.slice(1, -1);
		}

		return { path, cmd };
	});

	// If CLI args exist, use those
	if (fromProcess.length) return fromProcess;

	// Otherwise, fall back to loading from config file
	const cwd = (argv.cwd as string | undefined) ?? process.cwd();
	const configPath = getConfigPath(argv, cwd);

	if (configPath) {
		let config: Arg[] | null = null;

		try {
			const fileContent = readFileSync(configPath, 'utf8');

			// Parse based on extension
			if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
				config = yaml.parse(fileContent);
			} else {
				config = JSON.parse(fileContent);
			}
		} catch (error) {
			const fileType =
				configPath.endsWith('.yaml') || configPath.endsWith('.yml')
					? 'YAML'
					: 'JSON';
			abort(`Invalid ${fileType} in config file`);
		}

		// Validate config structure
		if (!Array.isArray(config)) {
			abort('Invalid config file. Expected an array.');
		}

		for (const arg of config) {
			if (!arg || typeof arg !== 'object') {
				abort('Invalid config file. Expected an array of objects.');
			}

			if (!arg.path) {
				abort(`Invalid config file. Argument ${arg} is missing a path.`);
			}

			if (!arg.cmd) {
				abort(`Invalid config file. Argument ${arg} is missing a cmd.`);
			}
		}

		return config;
	}

	// If no CLI args and no valid config file found, fail
	abort('No arguments provided and the config file was not found.');
}
