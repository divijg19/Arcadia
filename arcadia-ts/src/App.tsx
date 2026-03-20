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
	get_contact_buffer_ptr(): number;
	get_contact_buffer_len(): number;
	apply_despawns(ids: Float32Array): void;
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
		// Tag constants mirror Rust `components::Tag` discriminants
		const TAG_PLAYER = 0;
		const TAG_OBSTACLE = 1;
		const TAG_BULLET = 2;
		const TAG_WALL = 3;
		const TAG_PICKUP = 4;
		const loop = new GameLoop((dt_ms: number) => {
			const mask = inputManager.getMask();
			coreRef.apply_input(mask);
			coreRef.apply_mouse(
				inputManager.getMouseX(),
				inputManager.getMouseY(),
				inputManager.isMouseDown(),
			);
			coreRef.update(dt_ms);

			// Contact buffer: read raw contact quads [e1, tag1, e2, tag2]
			const contactPtr = Number(coreRef.get_contact_buffer_ptr());
			const contactLen = Number(coreRef.get_contact_buffer_len());
			if (contactLen > 0) {
				const contactView = new Float32Array(
					wasmMemRef.buffer,
					contactPtr,
					contactLen,
				);
				const toDespawn = new Set<number>();
				let deltaScore = 0;
				for (let i = 0; i < contactLen / 4; i++) {
					const aIdF = contactView[i * 4];
					const aTag = contactView[i * 4 + 1];
					const bIdF = contactView[i * 4 + 2];
					const bTag = contactView[i * 4 + 3];

					// Bullet vs Obstacle -> despawn both, BOOM (+10)
					const isBulletObstacle =
						(aTag === TAG_BULLET && bTag === TAG_OBSTACLE) ||
						(bTag === TAG_BULLET && aTag === TAG_OBSTACLE);
					if (isBulletObstacle) {
						toDespawn.add(Math.trunc(aIdF));
						toDespawn.add(Math.trunc(bIdF));
						audio.playSound(1);
						deltaScore += 10;
						continue;
					}

					// Bullet vs Wall -> despawn bullet only, CLINK
					const isBulletWall =
						(aTag === TAG_BULLET && bTag === TAG_WALL) ||
						(bTag === TAG_BULLET && aTag === TAG_WALL);
					if (isBulletWall) {
						const bulletId = Math.trunc(aTag === TAG_BULLET ? aIdF : bIdF);
						toDespawn.add(bulletId);
						audio.playSound(2);
						continue;
					}

					// Player vs Pickup -> despawn pickup only, PICKUP (+50)
					const isPlayerPickup =
						(aTag === TAG_PLAYER && bTag === TAG_PICKUP) ||
						(bTag === TAG_PLAYER && aTag === TAG_PICKUP);
					if (isPlayerPickup) {
						const pickupId = Math.trunc(aTag === TAG_PICKUP ? aIdF : bIdF);
						toDespawn.add(pickupId);
						audio.playSound(2);
						deltaScore += 50;
					}
				}

				if (toDespawn.size > 0) {
					const arr = new Float32Array(Array.from(toDespawn.values()));
					coreRef.apply_despawns(arr);
				}
				if (deltaScore > 0) setScore((s) => s + deltaScore);
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

			// Update UI state (health) from WASM — keep score managed in TS
			try {
				const uiState = coreRef.get_ui_state();
				if (uiState && uiState.length >= 1) {
					// uiState[0] is health; we do not override TS-managed score here
				}
			} catch {
				// ignore if WASM bridge not ready
			}
		});

		// Quick Save / Load Hotkeys
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "F5") {
				e.preventDefault();
				if (coreRef) {
					const bytes = coreRef.save_state();
					localStorage.setItem(
						"arcadia_save",
						btoa(String.fromCharCode.apply(null, bytes as unknown as number[])),
					);
					console.log("Quicksaved! Bytes:", bytes.length);
				}
			} else if (e.key === "F9") {
				e.preventDefault();
				if (coreRef) {
					const b64 = localStorage.getItem("arcadia_save");
					if (b64) {
						const str = atob(b64);
						const bytes = new Uint8Array(str.length);
						for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
						const success = coreRef.load_state(bytes);
						console.log("Quickloaded:", success);
					}
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);

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
