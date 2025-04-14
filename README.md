```
▗▄▄▖ ▗▖ ▗▖▗▖  ▗▖ ▗▄▖ ▗▖   ▗▖
▐▌ ▐▌▐▌ ▐▌▐▛▚▖▐▌▐▌ ▐▌▐▌   ▐▌
▐▛▀▚▖▐▌ ▐▌▐▌ ▝▜▌▐▛▀▜▌▐▌   ▐▌
▐▌ ▐▌▝▚▄▞▘▐▌  ▐▌▐▌ ▐▌▐▙▄▄▖▐▙▄▄▖
```
![Version](https://img.shields.io/github/v/release/pillbugin/runall?style=flat-square)
![License](https://img.shields.io/github/license/pillbugin/runall?style=flat-square)

**Runall** is a simple utility designed to help developers run multiple commands simultaneously, simplifying workflows for applications that depend on several services or scripts running in parallel.

It opens a window with multiple tabs — one for each command — plus a dedicated tab that consolidates the logs from all commands in one place. Each command can also be started or stopped individually through the interface. 🧩

@TODO: GIF Example

---

## Features ✨

- 🧵 Run multiple commands at once
- 🪟 GUI window with one tab per command
- 📜 Global log tab combining all outputs
- 🛑▶️ Start/stop individual commands
- ⚙️ Configuration via CLI or config file (YAML/JSON)

---

## Usage 🧪

🐍 Note: Python is required for native modules used by the underlying terminal emulator. Please ensure Python 3.10 or 3.11 is available on your system.

### Install

You can install Runall globally using npm:

```bash
npm install -g @pillbugin/runall
```

Then, after setting a config file, you can run all commands with `runall`

### Build Manually 🛠️

To manually build Runall from source, clone the repository and run:

```bash
npm install
npm run package
```

This will create a `out` directory containing the built executable.

---

## Config File 🗂️

You need to use a config file to define the commands you want to run.

Runall supports:
- `run.config.yaml`
- `run.config.yml`
- `run.config.json`

By default, it looks for one of these files in the current working directory. You can also explicitly specify the file path:

```bash
runall --config ./my-config.yaml
# or
runall -c ./my-config.yaml
```

#### Configuration Format 🧾

A config file should export an **array of command objects**, each having:

- `path` *(required)*: the working directory for the command
- `cmd` *(required)*: the command to run
- `name` *(optional)*: a label for the tab/command

Example (YAML):

```yaml
- name: API Server
  path: ./apps/api
  cmd: go run main.go

- name: Queue Worker
  path: ./apps/queue
  cmd: node worker.js

- name: Web App
  path: ./apps/web
  cmd: npm run dev
```

The order of the array determines the order of the tabs.

---

## License 📄

MIT License
