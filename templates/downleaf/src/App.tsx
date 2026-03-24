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
	// We make this a mutable let so loadGame can update it if necessary
	let playerId = -1;
	let justLoaded = false;

	// Game Constants
	const TAG_PLAYER = 0;
	const TAG_OBSTACLE = 1;
	const TAG_BULLET = 2;
	const TAG_WALL = 3;
	const TAG_PICKUP = 4;

	const saveGame = () => {
		if (!engine.core) return;
		engine.core.set_score(score()); // Grab latest score
		const bytes = engine.core.save_state();
		let binary = "";
		for (let i = 0; i < bytes.length; i++)
			binary += String.fromCharCode(bytes[i] ?? 0);
		localStorage.setItem("arcadia_downleaf_save", btoa(binary));
		console.log("Downleaf Saved!");
	};

	const loadGame = () => {
		if (!engine.core) return;
		const b64 = localStorage.getItem("arcadia_downleaf_save");
		if (b64) {
			const str = atob(b64);
			const bytes = new Uint8Array(str.length);
			for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
			if (engine.core.load_state(bytes)) {
				setScore(Number(engine.core.get_ui_state()[1] ?? 0)); // Restore score UI
				justLoaded = true; // Trigger zero-tick camera snap

				// CRITICAL FIX: After loading, we must find the new EntityId for the player!
				const rPtr = Number(engine.core.get_render_buffer_ptr());
				const rLen = Number(engine.core.get_render_buffer_len());
				const wasmMem = (
					engine as unknown as { wasmMemory: WebAssembly.Memory }
				).wasmMemory;
				const rView = new Float32Array(wasmMem.buffer, rPtr, rLen);
				for (let i = 0; i < rLen / 5; i++) {
					const maybeSprite = rView[i * 5 + 4];
					if (maybeSprite === 0.0) {
						// SpriteId 0.0 is Player
						const maybeId = rView[i * 5 + 0];
						if (typeof maybeId === "number") playerId = Math.trunc(maybeId);
						break;
					}
				}
				console.log("Downleaf Loaded! New Player ID:", playerId);
			}
		}
	};

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

	onMount(async () => {
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		await engine.init(canvas);

		engine.onContacts = (contacts, count) => {
			const despawns = new Set<number>();
			let deltaScore = 0;

			for (let i = 0; i < count; i++) {
				const offset = i * 4;
				const rawId1 = contacts[offset + 0];
				const rawTag1 = contacts[offset + 1];
				const rawId2 = contacts[offset + 2];
				const rawTag2 = contacts[offset + 3];

				const id1 = Number(rawId1 ?? 0);
				const tag1 = Number(rawTag1 ?? 0);
				const id2 = Number(rawId2 ?? 0);
				const tag2 = Number(rawTag2 ?? 0);

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
					despawns.add(Math.trunc(id1)).add(Math.trunc(id2));
					engine.audio.playSound(1); // Boom
					deltaScore += 10;
				} else if (isBulletWall) {
					despawns.add(Math.trunc(tag1 === TAG_BULLET ? id1 : id2));
					engine.audio.playSound(2); // Clink
				} else if (isPlayerPickup) {
					despawns.add(Math.trunc(tag1 === TAG_PICKUP ? id1 : id2));
					engine.audio.playSound(2); // Ping
					deltaScore += 50;
				}
			}

			if (deltaScore > 0) setScore((s) => s + deltaScore);
			if (despawns.size > 0) {
				engine.core.apply_despawns(new Float32Array(Array.from(despawns)));
			}
		};

		window.addEventListener("keydown", (e) => {
			if (scene() !== "GAME") return;
			if (e.key === "F5") {
				e.preventDefault();
				saveGame();
			} else if (e.key === "F9") {
				e.preventDefault();
				loadGame();
			}
		});
	});

	const startGame = () => {
		setScene("GAME");
		setScore(0);
		const seed = Math.floor(Date.now() / 1000);
		const random = mulberry32(seed);

		const width = 2000;
		const height = 4000;

		// 1. Spawn Player
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
		engine.core.add_gravity(playerId, 0.8, 15.0);

		// 2. Spawn Boundary Walls
		for (let y = 0; y < height; y += 32) {
			engine.core.spawn(0, y, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0);
			engine.core.spawn(width, y, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0);
		}

		// CRITICAL FIX: Spawn a THICK solid floor to prevent high-speed tunneling off the map
		for (let x = 0; x <= width; x += 32) {
			engine.core.spawn(
				x,
				height - 32,
				0,
				0,
				32,
				32,
				false,
				2,
				1,
				3.0,
				TAG_WALL,
				0,
			);
			engine.core.spawn(x, height, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0);
			engine.core.spawn(
				x,
				height + 32,
				0,
				0,
				32,
				32,
				false,
				2,
				1,
				3.0,
				TAG_WALL,
				0,
			);
		}

		// 3. Procedural Platform Generation
		for (let y = 300; y < height - 100; y += 150) {
			const platformWidth = Math.floor(3 + random() * 5);
			const startX = 100 + random() * (width - 400);

			for (let i = 0; i < platformWidth; i++) {
				const ox = startX + i * 32;
				engine.core.spawn(ox, y, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0);
			}

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

			// --- ZERO-TICK SYNC (Runs exactly once after loading) ---
			if (justLoaded) {
				engine.core.update(0.0); // Flush the newly loaded ECS state to the render_buffer!

				const memory = (engine as unknown as { wasmMemory: WebAssembly.Memory })
					.wasmMemory;
				const rPtr = Number(engine.core.get_render_buffer_ptr());
				const rLen = Number(engine.core.get_render_buffer_len());

				if (rLen > 0) {
					const rView = new Float32Array(memory.buffer, rPtr, rLen);
					for (let i = 0; i < rLen / 5; i++) {
						const offset = i * 5;
						const spriteId = Number(rView[offset + 4] ?? -1);
						if (spriteId === 0.0) {
							// SpriteId 0.0 is the Player
							// ACQUIRE THE NEW PLAYER ID!
							playerId = Math.trunc(Number(rView[offset + 0] ?? -1));

							const px = Number(rView[offset + 1] ?? 0);
							const py = Number(rView[offset + 2] ?? 0);

							// Snap the camera instantly to the loaded player
							const newCamY = Math.max(0, Math.min(py - 300, height - 600));
							const newCamX = Math.max(0, Math.min(px - 400, width - 800));
							engine.core.set_camera(newCamX, newCamY);
							break;
						}
					}
				}

				justLoaded = false;
				return; // Skip one physics frame so the camera stabilizes
			}

			// 1. EXTRACT PLAYER POSITION (Normal Gameplay)
			let playerX = 1000;
			let playerY = 100;
			let playerFound = false;

			const memory = (engine as unknown as { wasmMemory: WebAssembly.Memory })
				.wasmMemory;
			const rPtr = Number(engine.core.get_render_buffer_ptr());
			const rLen = Number(engine.core.get_render_buffer_len());

			if (rLen > 0) {
				const rView = new Float32Array(memory.buffer, rPtr, rLen);
				for (let i = 0; i < rLen / 5; i++) {
					const offset = i * 5;
					const idRaw = Number(rView[offset + 0] ?? -1);
					if (Math.trunc(idRaw) === Math.trunc(playerId)) {
						playerX = Number(rView[offset + 1] ?? playerX);
						playerY = Number(rView[offset + 2] ?? playerY);
						playerFound = true;
						break;
					}
				}
			}

			if (!playerFound) return; // If dead, freeze camera.

			// 2. PLATFORMER CONTROLS
			const mask = engine.input.getMask();
			let vx = 0;
			if ((mask & 4) !== 0) vx = -6.0; // LEFT
			if ((mask & 8) !== 0) vx = 6.0; // RIGHT

			engine.core.set_velocity(playerId, vx, NaN);

			// 3. JUMP LOGIC
			if (jumpCooldown > 0) jumpCooldown--;
			if ((mask & 1) !== 0 && jumpCooldown <= 0) {
				if (engine.core.is_grounded(playerId)) {
					engine.core.apply_impulse(playerId, 0, -18.0);
					engine.audio.playSound(2);
					jumpCooldown = 15;
				}
			}

			// 4. NORMAL CAMERA MOVEMENT (Only scroll DOWN)
			const targetCamY = playerY - 300;
			const currentCamY = engine.core.get_camera_y();
			let newCamY = Math.max(currentCamY, targetCamY);
			newCamY = Math.max(0, Math.min(newCamY, height - 600));

			let newCamX = playerX - 400;
			newCamX = Math.max(0, Math.min(newCamX, width - 800));

			engine.core.set_camera(newCamX, newCamY);

			// 5. TRUE DEATH PLANE
			if (playerY > newCamY + 650) {
				engine.core.apply_despawns(new Float32Array([playerId]));
				engine.audio.playSound(1); // Boom
				setScore(0);
			}
		};

		engine.start();
	};

	return (
		<div class="app-root" style={{ position: "relative" }}>
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
