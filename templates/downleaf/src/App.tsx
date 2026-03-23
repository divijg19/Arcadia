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
					despawns.add(
						tag1 === TAG_PICKUP
							? (id1 as unknown as number)
							: (id2 as unknown as number),
					);
					engine.audio.playSound(2); // Ping
					setScore((s) => s + 50);
				}
			}

			if (despawns.size > 0) {
				engine.core.apply_despawns(new Float32Array(Array.from(despawns)));
			}
		};

		// Quick Save/Load Hotkeys
		window.addEventListener("keydown", (e) => {
			if (e.key === "F5") {
				e.preventDefault();
				const bytes = engine.core.save_state();
				localStorage.setItem(
					"arcadia_save",
					btoa(String.fromCharCode.apply(null, bytes as unknown as number[])),
				);
			} else if (e.key === "F9") {
				e.preventDefault();
				const b64 = localStorage.getItem("arcadia_save");
				if (b64) {
					const str = atob(b64);
					const bytes = new Uint8Array(str.length);
					for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
					engine.core.load_state(bytes);
				}
			}
		});
	});

	const startGame = () => {
		setScene("GAME");
		const seed = Math.floor(Date.now() / 1000);
		const random = mulberry32(seed);

		const width = 2000;
		const height = 4000; // Much taller world for a descent!

		// 1. Spawn Player (Tag: 0, Layer: 1, Mask: 2) at the top
		playerId = engine.core.spawn(
			1000,
			100,
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

		// --- THE MAGIC: Turn the player into a Platformer character! ---
		engine.core.add_gravity(playerId as number, 0.8, 15.0); // 0.8 Accel, 15.0 Max Fall Speed

		// 2. Spawn Boundary Walls
		for (let y = 0; y < height; y += 32) {
			engine.core.spawn(0, y, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0);
			engine.core.spawn(width, y, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0);
		}
		for (let x = 0; x <= width; x += 32) {
			engine.core.spawn(x, height, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0); // Solid Floor
		}

		// 3. Procedural Platform Generation
		// Instead of random blocks, we generate horizontal platforms
		for (let y = 300; y < height - 100; y += 150) {
			const platformWidth = Math.floor(3 + random() * 5); // 3 to 7 blocks wide
			const startX = 100 + random() * (width - 400);

			for (let i = 0; i < platformWidth; i++) {
				const ox = startX + i * 32;
				engine.core.spawn(ox, y, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0);
			}

			// 20% chance to spawn a Coin (Pickup) on the platform
			if (random() > 0.8) {
				const coinX = startX + (platformWidth * 32) / 2;
				engine.core.spawn(
					coinX,
					y - 32,
					0,
					0,
					16,
					16,
					true,
					8,
					0,
					4.0,
					TAG_PICKUP,
					0,
				);
			}
		}

		let jumpCooldown = 0;

		engine.onTick = (ticks) => {
			setTickCount(ticks);

			// --- PLATFORMER CONTROLS ---
			const mask = engine.input.getMask();
			let vx = 0;

			// Left/Right Movement
			if ((mask & 4) !== 0) vx = -6.0; // LEFT
			if ((mask & 8) !== 0) vx = 6.0; // RIGHT

			// Set X velocity, ignore Y (let gravity handle it)
			engine.core.set_velocity(playerId as number, vx, NaN);

			// Jump Logic
			if (jumpCooldown > 0) jumpCooldown--;

			// If UP (1) or Spacebar is pressed
			if ((mask & 1) !== 0 && jumpCooldown <= 0) {
				// Check if we are touching the floor!
				if (engine.core.is_grounded(playerId as number)) {
					// Apply a massive upwards impulse
					engine.core.apply_impulse(playerId as number, 0, -18.0);
					engine.audio.playSound(2); // Jump Sound
					jumpCooldown = 15; // Prevent double-triggering
				}
			}
		};

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
					<button
						type="button"
						onClick={() => {
							const bytes = engine.core.save_state();
							localStorage.setItem(
								"arcadia_save",
								btoa(
									String.fromCharCode.apply(null, bytes as unknown as number[]),
								),
							);
						}}
					>
						Save State
					</button>
					<button
						type="button"
						onClick={() => {
							const b64 = localStorage.getItem("arcadia_save");
							if (b64) {
								const str = atob(b64);
								const bytes = new Uint8Array(str.length);
								for (let i = 0; i < str.length; i++)
									bytes[i] = str.charCodeAt(i);
								engine.core.load_state(bytes);
							}
						}}
					>
						Load State
					</button>
				</div>
			</Show>
		</div>
	);
}

export default App;
