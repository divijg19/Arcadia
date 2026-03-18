import { createSignal, onMount } from "solid-js";
import "./App.css";
import { AudioEngine } from "./audio/AudioEngine";
import { GameLoop } from "./engine/GameLoop";
import { InputManager } from "./input/InputManager";
import { Renderer } from "./renderer/Renderer";

// Explicit wasm/Arcadia types to avoid `any` and satisfy the linter
type WasmInitResult = { memory?: WebAssembly.Memory };

type ArcadiaCoreInstance = {
	get_render_buffer_ptr(): number;
	get_render_buffer_len(): number;
	get_tick_count(): number;
	get_camera_x(): number;
	get_camera_y(): number;
	apply_input(mask: number): void;
	apply_mouse(x: number, y: number, is_down: boolean): void;
	get_event_buffer_ptr(): number;
	get_event_buffer_len(): number;
	clear_events(): void;
	update(dt_ms: number): void;
	init_world(seed: number): void;
};

type WasmModule = {
	default?: () => Promise<WasmInitResult>;
	ArcadiaCore: { new (): ArcadiaCoreInstance };
};

function App() {
	const [tickCount, setTickCount] = createSignal(0);

	onMount(async () => {
		// import the wasm module and initialize it (captures memory in the returned exports)
		const mod = (await import(
			"../../arcadia-rs/pkg/arcadia_rs.js"
		)) as unknown as WasmModule;
		const wasmExports: WasmInitResult | null =
			mod && typeof mod.default === "function" ? await mod.default() : null;

		const core = new mod.ArcadiaCore();

		// input manager (maps keyboard state to a bitmask)
		const inputManager = new InputManager();
		// audio engine for synthesized SFX (initialized on first user gesture)
		const audio = new AudioEngine();
		// Ensure user gesture unlocks audio context
		window.addEventListener(
			"mousedown",
			() => {
				try {
					audio.init();
				} catch {
					// ignore
				}
			},
			{ once: true },
		);

		// setup renderer
		const renderer = new Renderer();
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		await renderer.init(canvas);

		// ensure we have access to WASM memory from the init result
		if (!wasmExports || !wasmExports.memory) {
			console.error(
				"WASM exports or memory not available; cannot create zero-copy view",
			);
			return;
		}

		// Cache the WebAssembly memory reference to satisfy TypeScript's nullability checks
		const wasmMemory = wasmExports.memory as WebAssembly.Memory;

		// Initialize the world procedurally in WASM with a deterministic seed
		core.init_world(1337);

		// create zero-copy view lazily inside the loop to handle WASM memory growth / reallocations
		let memoryView: Float32Array | null = null;

		const loop = new GameLoop((dt_ms: number) => {
			// read input mask from TS InputManager and apply to Rust core
			const mask = inputManager.getMask();
			core.apply_input(mask);

			// pass raw mouse coordinates & button state to WASM (canvas-relative)
			core.apply_mouse(
				inputManager.getMouseX(),
				inputManager.getMouseY(),
				inputManager.isMouseDown(),
			);

			core.update(dt_ms);

			// Check if view needs to be recreated (due to WASM memory growth or vector reallocation)
			const ptr = Number(core.get_render_buffer_ptr());
			const len = Number(core.get_render_buffer_len());
			if (
				!memoryView ||
				memoryView.buffer !== wasmMemory.buffer ||
				memoryView.byteOffset !== ptr ||
				memoryView.length !== len
			) {
				memoryView = new Float32Array(wasmMemory.buffer, ptr, len);
			}

			// draw directly from the zero-copy Float32Array. Read camera from WASM.
			const camX = core.get_camera_x();
			const camY = core.get_camera_y();
			renderer.draw(memoryView as Float32Array, camX, camY);

			// Process event buffer emitted from WASM (each event is 3 floats: [type, x, y])
			const eventPtr = Number(core.get_event_buffer_ptr());
			const eventLen = Number(core.get_event_buffer_len());
			if (eventLen > 0) {
				const eventView = new Float32Array(
					wasmMemory.buffer,
					eventPtr,
					eventLen,
				);
				const eventCount = Math.floor(eventLen / 3);
				for (let i = 0; i < eventCount; i++) {
					const offset = i * 3;
					const type = eventView[offset + 0];
					if (type === 1.0) {
						audio.playExplosion();
					} else if (type === 2.0) {
						audio.playPing();
					}
				}
				core.clear_events();
			}

			setTickCount(core.get_tick_count());
		});

		loop.start();
	});

	return (
		<div class="app-root">
			<canvas id="game-canvas" width="800" height="600"></canvas>
			<div class="tick-counter">Ticks: {tickCount()}</div>
		</div>
	);
}

export default App;
