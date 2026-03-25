import { createSignal, onMount, Show } from "solid-js";
import "./App.css";
import { ArcadiaEngine } from "arcadia-ts";

type SceneState = "MENU" | "GAME";

function App() {
	const [scene, setScene] = createSignal<SceneState>("MENU");
	const [tickCount, setTickCount] = createSignal(0);
	const [score, setScore] = createSignal(0);

	const engine = new ArcadiaEngine();

	// Track spawned player entity id so TS can apply velocities via FFI
	let playerId: number | null = null;

	// Simple deterministic PRNG (Mulberry32) used to replace Rust procgen
	function mulberry32(a: number) {
		let s = a >>> 0;
		return () => {
			s = (s + 0x6d2b79f5) >>> 0;
			let t = s;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	// Game Constants
	const TAG_PLAYER = 0;
	const TAG_OBSTACLE = 1;
	const TAG_BULLET = 2;
	const TAG_WALL = 3;
	const TAG_PICKUP = 4;

	// World size (promoted so onTick can access when camera clamps)
	let width = 2000;
	let height = 2000;

	// --- Save/Load helpers (isolated storage key for Spinfall) ---
	const saveGame = () => {
		if (!engine.core) return;
		engine.core.set_score(score()); // ensure latest score is stored in WASM
		const bytes = engine.core.save_state();
		let binary = "";
		for (let i = 0; i < bytes.length; i++)
			binary += String.fromCharCode(bytes[i] ?? 0);
		localStorage.setItem("arcadia_spinfall_save", btoa(binary));
		console.log("Spinfall Saved!");
	};

	const loadGame = () => {
		if (!engine.core) return;
		const b64 = localStorage.getItem("arcadia_spinfall_save");
		if (b64) {
			const str = atob(b64);
			const bytes = new Uint8Array(str.length);
			for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
			if (engine.core.load_state(bytes)) {
				setScore(Number(engine.core.get_ui_state()[1] ?? 0));
				console.log("Spinfall Loaded!");
			}
		}
	};

	// Hotkeys attached at App scope so closures read latest signals
	window.addEventListener("keydown", (e) => {
		if (e.key === "F5") {
			e.preventDefault();
			saveGame();
		} else if (e.key === "F9") {
			e.preventDefault();
			loadGame();
		}
	});

	onMount(async () => {
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		await engine.init(canvas);

		// Define our Game's specific rules
		engine.onContacts = (contacts, count) => {
			const despawns = new Set<number>();

			for (let i = 0; i < count; i++) {
				const offset = i * 4;
				const id1 = contacts[offset + 0],
					tag1 = contacts[offset + 1];
				const id2 = contacts[offset + 2],
					tag2 = contacts[offset + 3];

				const isBulletObstacle =
					(tag1 === TAG_BULLET && tag2 === TAG_OBSTACLE) ||
					(tag2 === TAG_BULLET && tag1 === TAG_OBSTACLE);
				const isBulletWall =
					(tag1 === TAG_BULLET && tag2 === TAG_WALL) ||
					(tag2 === TAG_BULLET && tag1 === TAG_WALL);
				const isPlayerPickup =
					(tag1 === TAG_PLAYER && tag2 === TAG_PICKUP) ||
					(tag2 === TAG_PLAYER && tag1 === TAG_PICKUP);

				if (isBulletObstacle) {
					despawns.add(id1 as unknown as number).add(id2 as unknown as number);
					engine.audio.playSound(1); // Boom
					setScore((s) => s + 10);
				} else if (isBulletWall) {
					despawns.add(
						tag1 === TAG_BULLET
							? (id1 as unknown as number)
							: (id2 as unknown as number),
					);
					engine.audio.playSound(2); // Clink
				} else if (isPlayerPickup) {
					const candidate = tag1 === TAG_PICKUP ? id1 : id2;
					if (typeof candidate === "number") {
						const picked = Number(candidate);
						despawns.add(picked);
						engine.audio.playSound(2); // Ping
						setScore((s) => s + 50);
					}
				}
			}

			if (despawns.size > 0) {
				engine.core.apply_despawns(new Float32Array(Array.from(despawns)));
			}
		};

		let fireCooldown = 0;

		engine.onTick = (ticks) => {
			setTickCount(ticks);

			// 1. EXTRACT TRUE PLAYER POSITION (Zero-Copy)
			let playerX = width / 2;
			let playerY = height / 2;

			const memory = engine.wasmExports?.memory as
				| WebAssembly.Memory
				| undefined;
			if (!memory) return;
			const rPtr = Number(engine.core.get_render_buffer_ptr());
			const rLen = Number(engine.core.get_render_buffer_len());

			if (rLen > 0) {
				const rView = new Float32Array(memory.buffer, rPtr, rLen);
				const entityCount = Math.floor(rView.length / 5);
				for (let i = 0; i < entityCount; i++) {
					const offset = i * 5;
					const entId = rView[offset + 0];
					if (
						playerId !== null &&
						typeof entId === "number" &&
						entId === playerId
					) {
						const pxv = rView[offset + 1];
						const pyv = rView[offset + 2];
						if (typeof pxv === "number") playerX = pxv;
						if (typeof pyv === "number") playerY = pyv;
						break;
					}
				}
			}

			// 2. KINEMATIC MOVEMENT
			const mask = engine.input.getMask();
			let vx = 0;
			let vy = 0;
			if ((mask & 1) !== 0) vy = -5.0; // UP
			if ((mask & 2) !== 0) vy = 5.0; // DOWN
			if ((mask & 4) !== 0) vx = -5.0; // LEFT
			if ((mask & 8) !== 0) vx = 5.0; // RIGHT
			if (playerId !== null) engine.core.set_velocity(playerId, vx, vy);

			// 3. EXACT FIRING MATH
			if (fireCooldown > 0) fireCooldown -= 1000 / 60;
			if (engine.input.isMouseDown() && fireCooldown <= 0) {
				const camX = engine.core.get_camera_x();
				const camY = engine.core.get_camera_y();
				const mx = engine.input.getMouseX() + camX;
				const my = engine.input.getMouseY() + camY;
				const dx = mx - playerX;
				const dy = my - playerY;
				const len = Math.sqrt(dx * dx + dy * dy);

				if (len > 0) {
					const bvx = (dx / len) * 15.0;
					const bvy = (dy / len) * 15.0;
					engine.core.spawn(
						playerX,
						playerY,
						bvx,
						bvy,
						16,
						16,
						false,
						4,
						0,
						1.0,
						TAG_BULLET,
						2000.0,
					);
					fireCooldown = 150;
				}
			}

			// 4. CAMERA CLAMPING
			let camX = playerX - 400;
			let camY = playerY - 300;
			camX = Math.max(0, Math.min(camX, width - 800));
			camY = Math.max(0, Math.min(camY, height - 600));
			engine.core.set_camera(camX, camY);
		};

		// Start Loop (ProcGen moved to TS)
		engine.start();
	});

	const startGame = () => {
		setScene("GAME");
		const seed = Math.floor(Date.now() / 1000);
		const random = mulberry32(seed);

		width = 2000;
		height = 2000;

		// 1. Spawn Player (Tag: 0, Layer: 1, Mask: 2)
		playerId = engine.core.spawn(
			width / 2,
			height / 2,
			0,
			0,
			32,
			32,
			false,
			1,
			2,
			0.0,
			TAG_PLAYER,
			0,
		);
		engine.playerId = playerId as number;

		// 2. Spawn Walls (Tag: 3, Layer: 2, Mask: 1)
		for (let x = 0; x <= width; x += 32) {
			engine.core.spawn(x, 0, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0);
			engine.core.spawn(x, height, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0);
		}
		for (let y = 32; y < height; y += 32) {
			engine.core.spawn(0, y, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0);
			engine.core.spawn(width, y, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0);
		}

		// 3. Spawn Obstacles (Tag: 1, Layer: 2, Mask: 1)
		let spawned = 0;
		while (spawned < 2000) {
			const gridX = Math.floor(3 + random() * (width / 32 - 6));
			const gridY = Math.floor(3 + random() * (height / 32 - 6));
			const ox = gridX * 32;
			const oy = gridY * 32;

			const dx = ox - width / 2;
			const dy = oy - height / 2;
			if (Math.sqrt(dx * dx + dy * dy) < 100) continue;

			engine.core.spawn(
				ox,
				oy,
				0,
				0,
				32,
				32,
				false,
				2,
				1,
				2.0,
				TAG_OBSTACLE,
				0,
			);
			spawned++;
		}

		// 4. Spawn Pickups (Tag: 4, Layer: 8, Mask: 0)
		for (let i = 0; i < 50; i++) {
			const px = 100 + random() * (width - 200);
			const py = 100 + random() * (height - 200);
			engine.core.spawn(px, py, 0, 0, 16, 16, true, 8, 0, 4.0, TAG_PICKUP, 0);
		}

		// Start Loop (ProcGen moved to TS)
		engine.start();
	};

	return (
		<div class="app-root" style={{ position: "relative" }}>
			{/* Canvas is ALWAYS in the DOM so onMount can attach PixiJS to it */}
			<canvas
				id="game-canvas"
				width="800"
				height="600"
				style={{ display: "block" }}
			></canvas>

			<Show when={scene() === "MENU"}>
				<div class="menu-screen">
					<h1>ARCADIA ENGINE</h1>
					<p>v1.0.0 Stable</p>
					<button type="button" onClick={startGame} class="play-button">
						START GAME
					</button>
				</div>
			</Show>

			<Show when={scene() === "GAME"}>
				<div
					class="ui-overlay"
					style={{
						position: "absolute",
						top: "10px",
						left: "10px",
						color: "white",
						"font-family": "monospace",
						"pointer-events": "none",
					}}
				>
					<div>Ticks: {tickCount()}</div>
					<div>Score: {score()}</div>
				</div>
				<div
					class="save-controls"
					style={{ position: "absolute", bottom: "10px", left: "10px" }}
				>
					<button type="button" onClick={saveGame}>
						Save State
					</button>
					<button type="button" onClick={loadGame}>
						Load State
					</button>
				</div>
			</Show>
		</div>
	);
}

export default App;
