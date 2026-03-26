# Arcadia-ts

Typescript runtime for Arcadia game engine, responsible for browser integration, rendering, and game logic. It interfaces with the Rust simulation runtime compiled to WebAssembly.

## Usage

```bash
$ bun install
```

```bash
$ wasm-pack build arcadia-rs --target web
```

Builds the compiled artifacts for production to the `dist` and `arcadia-rs/pkg` folders.<br>

The build is minified and the filenames include the hashes.<br>
