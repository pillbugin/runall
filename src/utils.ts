// Node and Electron imports
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { app, dialog } from 'electron';

import yaml from 'yaml';
import yargs from 'yargs';
// Type imports and external libs
import type { Arg } from './types';

/**
 * Show an error dialog and quit the app.
 * Used for any fatal error cases (e.g., bad config, invalid args).
 */
export function abort(message: string) {
	dialog.showErrorBox('Something went wrong', message);
	app.exit();
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
 * Parses and returns a list of Arg objects from config file.
 *
 * Supports input modes:
 * 1. Config file: YAML, JSON or JS.
 */
export function getConfig(): [Arg[], string] {
	const argv = yargs(process.argv).argv as yargs.Arguments;

	// Try loading config file
	const cwd = (argv.cwd as string | undefined) ?? process.cwd();
	const configPath = getConfigPath(argv, cwd);

	if (!configPath) {
		abort('The config file was not found.');
	}
	if (
		!['.yaml', '.yml', '.json', '.js'].some((ext) => configPath.endsWith(ext))
	) {
		abort(`Unsupported config file extension: ${configPath}`);
	}

	let config: Arg[] = [];
	try {
		// Parse based on extension
		if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
			config = yaml.parse(readFileSync(configPath, 'utf8'));
		} else {
			config = require(configPath);
		}
	} catch (error) {
		abort('Config file could not be parsed.');
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

	return [config, cwd];
}
