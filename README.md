# `Arcadia`

> A lightweight Rust + TypeScript engine for deterministic 2D browser games.

`Arcadia` is a hybrid game engine designed for building **small, fast, highly replayable browser games**.

The engine separates **simulation** from **rendering**:

- **Rust → WebAssembly** handles deterministic simulation and core systems
- **TypeScript** manages rendering, input, and browser integration

`Arcadia` is not a general-purpose engine.  
It is intentionally scoped for **arcade-scale games with short gameplay loops**.

`Arcadia` intentionally avoids the complexity of large engines.

It does not aim to provide:

- 3D rendering
- advanced physics
- visual editors
- asset pipelines

The engine is intentionally **small and focused**.

This architecture allows games to be:

- fast to iterate on
- deterministic and reproducible
- lightweight and browser-native
- reusable across many projects

---

# Architecture

`Arcadia` uses a **Rust–TypeScript hybrid runtime**.

```
Input (TypeScript)
↓
Game Logic (TypeScript)
↓
Simulation (Rust WASM)
↓
State Snapshot
↓
Rendering (TypeScript / PixiJS)
```

Rust owns simulation.

TypeScript owns the browser.

---

# Technology Stack

Core languages:

- Rust
- TypeScript

Tooling:

- Bun
- Vite
- wasm-bindgen
- wasm-pack

Rendering:

- PixiJS (WebGL)

Deployment:

- WASM for simulation
- Modern web browsers
- Static hosting platforms

---

# Development Workflow

Install dependencies.

```bash
bun install
```

Build Rust WASM runtime.

```bash
wasm-pack build arcadia-rs --target web
```

Run development server.

```bash
bun dev
```

---

# Repository Structure

```
Arcadia/
│
├─ Arcadia-rs/ # Rust simulation runtime
├─ Arcadia-ts/ # TypeScript browser runtime
│
├─ templates/ # starter templates for games
├─ examples/ # example games
│
├─ tools/ # asset utilities
├─ docs/
└─ scripts/
```

---

# Rust Runtime (Arcadia-rs)

The Rust runtime handles **deterministic simulation systems**.

Core modules include:


ecs/ entity-component system
physics/ arcade physics and collision
math/ vectors and transforms
rng/ deterministic random generator
procgen/ procedural generation systems
simulation/ gameplay systems


The runtime compiles to **WebAssembly** and exposes a minimal API to TypeScript.

---

# TypeScript Runtime (Arcadia-ts)

The TypeScript layer manages the browser environment.

Responsibilities include:


renderer/ PixiJS rendering layer
input/ keyboard, mouse, touch
scene/ scene and state management
assets/ asset loading
audio/ sound playback


The TypeScript runtime is responsible for rendering the simulation state produced by Rust.

---

# Engine Design Goals

`Arcadia` is designed around several core principles:

### Deterministic Simulation

Game logic runs in Rust with seeded randomness.

This allows reproducible runs and potential replay systems.

---

### Fast Iteration

Games should be easy to build and modify.

`Arcadia` focuses on **small engine size and minimal complexity**.

---

### Browser-Native

Games are designed to run instantly in the browser.

No installation required.

---

### Reusable Runtime

`Arcadia` aims to support **many small games built on a shared runtime**.

---

# Example Games

`Arcadia` is being built to support several experimental browser games.

A micro roguelike survival arena.

- top-down combat
- enemy waves
- arena rotation and scrolling
- upgrade system

---

A browser puzzle game inspired by escape rooms.

- logic puzzles
- clue discovery
- inventory interactions
- room progression

---

An infinite procedural platformer RPG.

- procedurally generated dungeon descent
- multiple gameplay modes
- character stats and progression

---

# License

MIT License
