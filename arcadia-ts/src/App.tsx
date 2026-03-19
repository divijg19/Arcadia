import { createSignal, onMount, Show } from "solid-js";
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
	get_ui_state(): Float32Array;
	save_state(): Uint8Array;
	load_state(data: Uint8Array): boolean;
};

type WasmModule = {
	default?: () => Promise<WasmInitResult>;
	ArcadiaCore: { new (): ArcadiaCoreInstance };
};

type SceneState = "MENU" | "GAME";

function App() {
	const [scene, setScene] = createSignal<SceneState>("MENU");
	const [tickCount, setTickCount] = createSignal(0);
	const [score, setScore] = createSignal(0);

	// We hoist these so the Game loop can access them
	let core: ArcadiaCoreInstance | null = null;
	let wasmMemory: WebAssembly.Memory | null = null;
	const inputManager = new InputManager();
	const audio = new AudioEngine();

	onMount(async () => {
		// Boot Phase: Load WASM immediately so it's ready when the user clicks Play
		const mod = (await import(
			"../../arcadia-rs/pkg/arcadia_rs.js"
		)) as unknown as WasmModule;
		const wasmExports: WasmInitResult | null =
			mod && typeof mod.default === "function" ? await mod.default() : null;

		if (!wasmExports || !wasmExports.memory) {
			console.error("Failed to initialize WASM memory");
			return;
		}

		core = new mod.ArcadiaCore();
		wasmMemory = wasmExports.memory;
	});

	const startGame = async () => {
		if (!core || !wasmMemory) return;

		// capture stable references to avoid non-null assertions after awaits
		const coreRef = core as ArcadiaCoreInstance;
		const wasmMemRef = wasmMemory as WebAssembly.Memory;

		// 1. Switch Scene
		setScene("GAME");

		// 2. Init Audio (Requires user interaction, so clicking 'Play' is perfect)
		audio.init();

		// 3. Init PixiJS
		const renderer = new Renderer();
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		await renderer.init(canvas);

		// 4. Generate a random world
		const seed = Math.floor(Date.now() / 1000); // Unique seed per run
		coreRef.init_world(seed);

		// 5. Start the Game Loop
		let memoryView: Float32Array | null = null;
		const loop = new GameLoop((dt_ms: number) => {
			const mask = inputManager.getMask();
			coreRef.apply_input(mask);
			coreRef.apply_mouse(
				inputManager.getMouseX(),
				inputManager.getMouseY(),
				inputManager.isMouseDown(),
			);
			coreRef.update(dt_ms);

			// Audio Events
			const eventPtr = Number(coreRef.get_event_buffer_ptr());
			const eventLen = Number(coreRef.get_event_buffer_len());
			if (eventLen > 0) {
				const eventView = new Float32Array(
					wasmMemRef.buffer,
					eventPtr,
					eventLen,
				);
				for (let i = 0; i < eventLen / 3; i++) {
					const type = eventView[i * 3];
					if (type === 1.0) audio.playExplosion();
					else if (type === 2.0) audio.playPing();
					else if (type === 3.0) audio.playPing();
				}
				coreRef.clear_events();
			}

			// Render Zero-Copy
			const ptr = Number(coreRef.get_render_buffer_ptr());
			const len = Number(coreRef.get_render_buffer_len());
			if (
				!memoryView ||
				memoryView.buffer !== wasmMemRef.buffer ||
				memoryView.byteOffset !== ptr ||
				memoryView.length !== len
			) {
				memoryView = new Float32Array(wasmMemRef.buffer, ptr, len);
			}

			renderer.draw(
				memoryView as Float32Array,
				coreRef.get_camera_x(),
				coreRef.get_camera_y(),
			);
			setTickCount(coreRef.get_tick_count());

			// Update UI state (score, health, etc.) from WASM
			try {
				const uiState = coreRef.get_ui_state();
				if (uiState && uiState.length >= 2) {
					setScore(uiState[1]);
				}
			} catch {
				// ignore if WASM bridge not ready
			}
		});

		loop.start();
	};

	return (
		<div class="app-root">
			<Show when={scene() === "MENU"}>
				<div class="menu-screen">
					<h1>ARCADIA ENGINE</h1>
					<p>v0.9.x Prototype</p>
					<button type="button" onClick={startGame} class="play-button">
						START GAME
					</button>
				</div>
			</Show>

			<Show when={scene() === "GAME"}>
				<canvas id="game-canvas" width="800" height="600"></canvas>
				<div class="tick-counter">Ticks: {tickCount()}</div>
				<div class="save-controls">
					<button
						type="button"
						onClick={() => {
							if (core) {
								const bytes = core.save_state();
								localStorage.setItem(
									"arcadia_save",
									btoa(
										String.fromCharCode.apply(
											null,
											bytes as unknown as number[],
										),
									),
								);
								console.log("Game Saved! Bytes:", bytes.length);
							}
						}}
					>
						Save State
					</button>

					<button
						type="button"
						onClick={() => {
							if (core) {
								const b64 = localStorage.getItem("arcadia_save");
								if (b64) {
									const str = atob(b64);
									const bytes = new Uint8Array(str.length);
									for (let i = 0; i < str.length; i++)
										bytes[i] = str.charCodeAt(i);
									const success = core.load_state(bytes);
									console.log("State Loaded:", success);
								}
							}
						}}
					>
						Load State
					</button>
				</div>
				<div class="score-counter">Score: {score()}</div>
			</Show>
		</div>
	);
}

export default App;
