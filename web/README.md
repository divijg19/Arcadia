# Arcadia OS Web

Arcadia OS is the Solid + TanStack Router frontend shell for the Arcadia monorepo.

It has three UX layers:

1. Portfolio (scrollable landing and engineering narrative)
2. Nexus (locked viewport carousel runtime selector)
3. Runtime (full-screen game canvas with boot sequence and overlay)

## Environment

Create an env file from `.env.example`:

```bash
cp .env.example .env
```

Required variable:

- `VITE_ARCADIA_GAMES_CDN_BASE`: base URL that hosts game modules and their wasm assets

## Universal Save

Arcadia OS persists one shared localStorage object:

- key: `arcadia_universal_save`
- schema: versioned global object with currency, achievements, and per-game snapshot slots

Per-game slots hold:

- `snapshotBase64`: opaque serialized runtime state
- `metadata`: arbitrary key/value metadata
- `updatedAt`: unix epoch milliseconds

## Remote Game Module Contract

Each game module loaded from CDN must export `createGameRuntime`:

```ts
export interface ArcadiaRuntimeSnapshot {
  snapshotBase64: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateArcadiaRuntimeArgs {
  canvas: HTMLCanvasElement;
  initialSnapshotBase64?: string | null;
  onSnapshot?: (snapshot: ArcadiaRuntimeSnapshot) => void;
  onStatus?: (line: string) => void;
}

export interface ArcadiaRemoteRuntime {
  start?: () => void | Promise<void>;
  pause?: () => void | Promise<void>;
  resume?: () => void | Promise<void>;
  snapshot?: () => ArcadiaRuntimeSnapshot | Promise<ArcadiaRuntimeSnapshot>;
  destroy: () => void | Promise<void>;
}

export interface ArcadiaRemoteGameModule {
  createGameRuntime: (
    args: CreateArcadiaRuntimeArgs,
  ) => ArcadiaRemoteRuntime | Promise<ArcadiaRemoteRuntime>;
}
```

### Lifecycle expectations

- `destroy` is mandatory and must release WebGL and wasm resources.
- `snapshot` should return the latest save payload before destruction when supported.
- `onStatus` emits short diagnostic lines for the boot sequence UI.

## Local Development

```bash
bun run dev
```

## Build

```bash
bun run build
```
