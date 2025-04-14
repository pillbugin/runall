#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process');
const os = require('os');
const { resolve, join } = require('path');
const { existsSync } = require('fs');
const { default: chalk } = require('chalk');

const plat = os.platform(); // 'win32', 'darwin', 'linux'
const arch = os.arch(); // 'x64', 'arm64', etc.

// Determine the correct binary extension based on OS
const ext = plat === 'win32' ? '.exe' : plat === 'darwin' ? '.app' : '';

// Build the expected path to the binary
const binaryPath = join(
	resolve(__dirname),
	`out/Runall-${plat}-${arch}/Runall${ext}`,
);

if (!existsSync(binaryPath)) {
	console.log(`📦 Building for ${plat}/${arch}...`);

	// Try to locate a Python interpreter (prioritize 3.10 and 3.11)
	const pythonPath = (() => {
		const candidates = ['python3.11', 'python3.10', 'python3', 'python'];
		for (const cmd of candidates) {
			const res = spawnSync(plat === 'win32' ? 'where' : 'which', [cmd], {
				stdio: 'pipe',
				shell: true,
			});
			if (res.status === 0) {
				return res.stdout.toString().split('\n')[0].trim();
			}
		}
		return null;
	})();

	console.log(chalk.dim(`   Using Python at: ${pythonPath || 'not found'}`));

	// Run the build script
	const result = spawnSync('npm', ['run', 'package'], {
		stdio: 'pipe',
		shell: true,
		env: {
			...process.env,
			NODE_ENV: 'production',
			FORCE_COLOR: '1',
			PYTHON: pythonPath ?? process.env.PYTHON,
		},
	});

	if (result.status !== 0) {
		console.log(result.stdout.toString());
		console.log(result.stderr.toString());

		if (
			!pythonPath ||
			(!pythonPath.includes('3.10') && !pythonPath.includes('3.11'))
		) {
			console.log(
				chalk.yellow.bold(
					'⚠️  Python 3.10 or 3.11 not found. Falling back to another version. Build may fail.',
				),
			);
		}

		console.log(chalk.red.bold('🅧  Failed to build application'));
		process.exit(1);
	}
}

const args = process.argv.slice(2);

// Run the built binary
if (plat === 'darwin') {
	// macOS apps are .app bundles; use `open -a`
	spawn('open', ['-a', binaryPath, '--args', '--cwd="$(pwd)"', ...args], {
		stdio: 'inherit',
		shell: true,
	}).unref();
} else {
	// On Linux & Windows, run the binary directly
	spawn(binaryPath, args, {
		stdio: 'inherit',
		shell: plat === 'win32', // Use shell on Windows for better compatibility
	}).unref();
}
