#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process');
const os = require('os');
const { join } = require('path');
const { existsSync, rmSync, writeFileSync, readFileSync } = require('fs');
const pkg = require(join(__dirname, 'package.json'));

const args = process.argv.slice(2);
// 'win32', 'darwin', 'linux'
const plat = os.platform();
// 'x64', 'arm64', etc.
const arch = os.arch();
// Determine the correct executable extension based on OS
const ext = plat === 'win32' ? '.exe' : plat === 'darwin' ? '.app' : '';
// Expected path to the executable
const exeDirname = join(__dirname, `out/Runall-${plat}-${arch}`);
const exeFilename = join(exeDirname, `Runall${ext}`);
const verFilename = join(exeDirname, 'package-version');

function main() {
  const pkgVer = existsSync(verFilename)
    ? readFileSync(verFilename, 'utf8').trim()
    : '';
  if (pkgVer !== pkg.version) {
    rmSync(join(__dirname, 'node_modules'), { recursive: true, force: true });
    rmSync(join(__dirname, '.webpack'), { recursive: true, force: true });
    rmSync(join(__dirname, 'out'), { recursive: true, force: true });
  }

  if (!existsSync(exeFilename)) {
    console.log(`📦 Building for ${plat}/${arch}...`);

    // Try to locate a Python interpreter (prioritize 3.10 and 3.11)
    const [versionOk, pythonPath] = getPythonPath();
    console.log(
      style(`   Using Python at: ${pythonPath || 'not found'}`, ['dim']),
    );

    // Install dependencies
    const installResult = spawnSync('npm', ['install'], {
      stdio: 'pipe',
      shell: true,
      cwd: __dirname,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        FORCE_COLOR: '1',
        PYTHON: pythonPath ?? process.env.PYTHON,
      },
    });

    if (installResult.status !== 0) {
      abort(installResult.stdout.toString(), installResult.stderr.toString());
    }

    // Run the build script
    const packageResult = spawnSync('npm', ['run', 'package'], {
      stdio: 'pipe',
      shell: true,
      cwd: __dirname,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        FORCE_COLOR: '1',
        PYTHON: pythonPath ?? process.env.PYTHON,
      },
    });

    if (packageResult.status !== 0) {
      if (!versionOk) {
        console.log(
          style(
            '⚠️  Python 3.10 or 3.11 not found. Falling back to another version. Build may fail.',
            ['yellow', 'bold'],
          ),
        );
      }

      abort(packageResult.stdout.toString(), packageResult.stderr.toString());
    }

    rmSync(join(__dirname, 'node_modules'), { recursive: true });
    rmSync(join(__dirname, '.webpack'), { recursive: true });
    writeFileSync(verFilename, pkg.version);
  }

  // Run the built binary
  if (plat === 'darwin') {
    // macOS apps are .app bundles; use `open -a`
    spawn('open', ['-a', exeFilename, '--args', '--cwd="$(pwd)"', ...args], {
      stdio: 'inherit',
      shell: true,
    }).unref();
  } else {
    // On Linux & Windows, run the binary directly
    spawn(exeFilename, args, {
      stdio: 'inherit',
      shell: plat === 'win32', // Use shell on Windows for better compatibility
    }).unref();
  }
}

function abort(...logs) {
  for (const log of logs ?? []) {
    console.log(log);
  }

  console.log(style('🅧  Failed to build application', ['bold', 'red']));
  process.exit(1);
}

function getPythonPath() {
  const candidates = ['python3.11', 'python3.10', 'python3', 'python'];
  for (const cmd of candidates) {
    const res = spawnSync(plat === 'win32' ? 'where' : 'which', [cmd], {
      stdio: 'pipe',
      shell: true,
    });
    if (res.status === 0) {
      const versionOk = ['python3.11', 'python3.10'].includes(cmd);
      return [versionOk, res.stdout.toString().split('\n')[0].trim()];
    }
  }
  return [false, null];
}

function style(text, ...styleNames) {
  const styles = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
  };

  const codes = styleNames.map((name) => styles[name] || '').join('');
  return `${codes}${text}${styles.reset}`;
}

main();
