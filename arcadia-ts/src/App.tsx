import { createSignal, onMount, Show } from "solid-js";
import "./App.css";
import { ArcadiaEngine } from "./engine/ArcadiaEngine";

type SceneState = "MENU" | "GAME";

function App() {
	const [scene, setScene] = createSignal<SceneState>("MENU");
	const [tickCount, setTickCount] = createSignal(0);
	const [score, setScore] = createSignal(0);

	const engine = new ArcadiaEngine();

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

		let fireCooldown = 0;

		engine.onTick = (ticks) => {
			setTickCount(ticks);

			// Temporary TS Firing Logic (v1.0.1): handle mouse firing client-side
			if (fireCooldown > 0) fireCooldown -= 1000 / 60;
			if (engine.input.isMouseDown() && fireCooldown <= 0) {
				const camX = engine.core.get_camera_x();
				const camY = engine.core.get_camera_y();
				const px = camX + 400; // Approx player X
				const py = camY + 300; // Approx player Y

				const mx = engine.input.getMouseX() + camX;
				const my = engine.input.getMouseY() + camY;
				const dx = mx - px;
				const dy = my - py;
				const len = Math.sqrt(dx * dx + dy * dy);

				if (len > 0) {
					const vx = (dx / len) * 15.0;
					const vy = (dy / len) * 15.0;
					// Spawn Bullet (Tag: 2, Layer: 4, Mask: 0, Sprite: 1.0, Lifetime: 2000ms)
					engine.core.spawn(
						px,
						py,
						vx,
						vy,
						8,
						8,
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
		const height = 2000;

		// 1. Spawn Player (Tag: 0, Layer: 1, Mask: 2)
		engine.core.spawn(
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
		<div class="app-root">
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
				<canvas
					id="game-canvas"
					width="800"
					height="600"
					style={{ display: "block" }}
				></canvas>
				<div
					class="ui-overlay"
					style="position:absolute; top:10px; left:10px; color:white; font-family:monospace; pointer-events:none;"
				>
					<div>Ticks: {tickCount()}</div>
					<div>Score: {score()}</div>
				</div>
				<div
					class="save-controls"
					style="position:absolute; bottom:10px; left:10px;"
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
