import { createSignal, onMount, Show } from "solid-js";
import "./App.css";
import { ArcadiaEngine } from "arcadia-ts";

type SceneState = "MENU" | "GAME";
type GameMode = "RPG" | "FLAPPY" | "FLIPPER";

function App() {
	const [scene, setScene] = createSignal<SceneState>("MENU");
	const [tickCount, setTickCount] = createSignal(0);
	const [score, setScore] = createSignal(0);
	const [mode, setMode] = createSignal<GameMode>("RPG");
	const [roomCount, setRoomCount] = createSignal(1);

	const engine = new ArcadiaEngine();

	let playerId = -1;
	let justLoaded = false;
	// treadmill architecture: no physical room index required
	let activeRoomEntities: number[] = []; // Track entities to despawn
	let currentMode: GameMode = "RPG"; // SYNCHRONOUS GAME STATE

	let isGravityInverted = false;

	const TAG_PLAYER = 0;
	const TAG_OBSTACLE = 1;
	const TAG_WALL = 3;
	const TAG_PICKUP = 4;

	const saveGame = () => {
		if (!engine.core) return;
		engine.core.set_score(score());
		const bytes = engine.core.save_state();
		let binary = "";
		for (let i = 0; i < bytes.length; i++)
			binary += String.fromCharCode(bytes[i] ?? 0);
		const payload = {
			ecsBytes: btoa(binary),
			roomCount: roomCount(),
			mode: mode(),
			isGravityInverted: isGravityInverted,
		};
		localStorage.setItem("arcadia_downleaf_save", JSON.stringify(payload));
		console.log("Downleaf Saved!");
	};

	const loadGame = () => {
		if (!engine.core) return;
		const jsonStr = localStorage.getItem("arcadia_downleaf_save");
		if (jsonStr) {
			const payload = JSON.parse(jsonStr);
			const str = atob(payload.ecsBytes);
			const bytes = new Uint8Array(str.length);
			for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
			if (engine.core.load_state(bytes)) {
				setScore(Number(engine.core.get_ui_state()[1] ?? 0));
				// Restore TS Local State
				setRoomCount(payload.roomCount);
				currentMode = payload.mode as GameMode;
				setMode(currentMode);
				isGravityInverted = payload.isGravityInverted;
				justLoaded = true;
				console.log("Downleaf Loaded!");
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

	// --- THE ROOM FACTORY ---
	const generateRoom = (
		_roomIdx: number,
		newMode: GameMode,
		random: () => number,
	) => {
		// 1. Clean up the old room
		if (activeRoomEntities.length > 0) {
			engine.core.apply_despawns(new Float32Array(activeRoomEntities));
			activeRoomEntities = [];
		}

		// TREADMILL: Always generate room at origin to avoid large X coords
		const roomStartX = 0;
		const roomEndX = 800;

		// 2. Base Boundaries (Floor and Ceiling)
		for (let x = roomStartX; x <= roomEndX; x += 32) {
			activeRoomEntities.push(
				engine.core.spawn(x, 0, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0),
			); // Ceiling
			activeRoomEntities.push(
				engine.core.spawn(x, 600, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0),
			); // Floor
		}

		// Left Wall (Only in the very first room to prevent running backwards at start)
		if (roomCount() === 1) {
			for (let y = 32; y < 600; y += 32) {
				activeRoomEntities.push(
					engine.core.spawn(0, y, 0, 0, 32, 32, false, 2, 1, 3.0, TAG_WALL, 0),
				);
			}
		}

		// 3. Mode-Specific Generation
		if (newMode === "RPG") {
			engine.core.invert_gravity(playerId, false);
			// Platforms & Coins
			for (let x = roomStartX + 150; x < roomEndX - 100; x += 200) {
				const platY = 300 + random() * 200;
				const platW = Math.floor(2 + random() * 3);
				for (let i = 0; i < platW; i++) {
					activeRoomEntities.push(
						engine.core.spawn(
							x + i * 32,
							platY,
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
						),
					);
				}
				if (random() > 0.4)
					activeRoomEntities.push(
						engine.core.spawn(
							x + 32,
							platY - 32,
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
						),
					);
				if (random() > 0.8)
					activeRoomEntities.push(
						engine.core.spawn(
							x + 64,
							platY - 32,
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
						),
					); // Spike
			}
		} else if (newMode === "FLAPPY") {
			engine.core.invert_gravity(playerId, false);
			// Deadly Pipes
			for (let x = roomStartX + 200; x < roomEndX - 50; x += 250) {
				const gapCenter = 200 + random() * 200;
				const gapSize = 120;
				activeRoomEntities.push(
					engine.core.spawn(
						x,
						gapCenter - gapSize - 200,
						0,
						0,
						64,
						400,
						false,
						2,
						1,
						3.0,
						TAG_OBSTACLE,
						0,
					),
				); // Top Pipe
				activeRoomEntities.push(
					engine.core.spawn(
						x,
						gapCenter + gapSize + 200,
						0,
						0,
						64,
						400,
						false,
						2,
						1,
						3.0,
						TAG_OBSTACLE,
						0,
					),
				); // Bottom Pipe
				activeRoomEntities.push(
					engine.core.spawn(
						x,
						gapCenter,
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
					),
				); // Coin in gap
			}
		} else if (newMode === "FLIPPER") {
			// Gravity Spikes
			for (let x = roomStartX + 150; x < roomEndX - 100; x += 150) {
				const isTopSpike = random() > 0.5;
				const y = isTopSpike ? 48 : 552;
				activeRoomEntities.push(
					engine.core.spawn(
						x,
						y,
						0,
						0,
						64,
						64,
						false,
						2,
						1,
						2.0,
						TAG_OBSTACLE,
						0,
					),
				);
				activeRoomEntities.push(
					engine.core.spawn(
						x,
						300,
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
					),
				);
			}
		}
	};

	onMount(async () => {
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		await engine.init(canvas);

		engine.onContacts = (contacts, count) => {
			const despawns = new Set<number>();
			let deltaScore = 0;

			for (let i = 0; i < count; i++) {
				const offset = i * 4;
				const id1 = Number(contacts[offset + 0] ?? 0);
				const tag1 = Number(contacts[offset + 1] ?? 0);
				const id2 = Number(contacts[offset + 2] ?? 0);
				const tag2 = Number(contacts[offset + 3] ?? 0);

				const isPlayerPickup =
					(tag1 === TAG_PLAYER && tag2 === TAG_PICKUP) ||
					(tag2 === TAG_PLAYER && tag1 === TAG_PICKUP);
				const isPlayerObstacle =
					(tag1 === TAG_PLAYER && tag2 === TAG_OBSTACLE) ||
					(tag2 === TAG_PLAYER && tag1 === TAG_OBSTACLE);

				if (isPlayerPickup) {
					despawns.add(Math.trunc(tag1 === TAG_PICKUP ? id1 : id2));
					engine.audio.playSound(2); // Ping
					deltaScore += 50;
				} else if (isPlayerObstacle) {
					despawns.add(playerId); // Player dies!
					engine.audio.playSound(1); // Boom
					setScore(0);
				}
			}

			if (deltaScore > 0) setScore((s) => s + deltaScore);
			if (despawns.size > 0)
				engine.core.apply_despawns(new Float32Array(Array.from(despawns)));
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

		// CRITICAL FIX: Destroy all ghost entities from previous runs before starting!
		engine.core.clear_world();
		setScore(0);
		setRoomCount(1);
		activeRoomEntities = [];

		const seed = Math.floor(Date.now() / 1000);
		const random = mulberry32(seed);

		// 1. Spawn Player
		playerId = engine.core.spawn(
			100,
			300,
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

		// 2. Generate Room 0
		currentMode = "RPG";
		setMode(currentMode);
		generateRoom(0, currentMode, random);

		let jumpCooldown = 0;

		engine.onTick = (ticks) => {
			setTickCount(ticks);

			if (justLoaded) {
				engine.core.update(0.0);
				const memory = engine.wasmExports?.memory as
					| WebAssembly.Memory
					| undefined;
				if (!memory) return;
				const rPtr = Number(engine.core.get_render_buffer_ptr());
				const rLen = Number(engine.core.get_render_buffer_len());
				const rView = new Float32Array(memory.buffer, rPtr, rLen);

				let loadedX = 100;
				for (let i = 0; i < rLen / 5; i++) {
					const idRaw = rView[i * 5 + 0] ?? 0;
					const spriteId = rView[i * 5 + 4] ?? -1;
					if (spriteId === 0.0) {
						playerId = Math.trunc(idRaw as number);
						loadedX = (rView[i * 5 + 1] ?? loadedX) as number;
						break;
					}
				}

				// Camera locked at origin for treadmill
				engine.core.set_camera(0, 0);
				engine.core.invert_gravity(playerId, isGravityInverted);
				justLoaded = false;
				return;
			}

			// 1. EXTRACT PLAYER POSITION
			let playerX = 100;
			let playerY = 300;
			let playerFound = false;
			const memory = engine.wasmExports?.memory as
				| WebAssembly.Memory
				| undefined;
			if (!memory) return;
			const rPtr = Number(engine.core.get_render_buffer_ptr());
			const rLen = Number(engine.core.get_render_buffer_len());
			if (rLen > 0) {
				const rView = new Float32Array(memory.buffer, rPtr, rLen);
				for (let i = 0; i < rLen / 5; i++) {
					const idRaw = rView[i * 5 + 0] ?? 0;
					if (Math.trunc(idRaw as number) === playerId) {
						playerX = (rView[i * 5 + 1] ?? playerX) as number;
						playerY = (rView[i * 5 + 2] ?? playerY) as number;
						playerFound = true;
						break;
					}
				}
			}

			if (!playerFound) {
				if (jumpCooldown <= 0)
					jumpCooldown = 60; // Death timer
				else {
					jumpCooldown--;
					if (jumpCooldown <= 1) startGame(); // Restart
				}
				return;
			}

			// --- THE TREADMILL ROOM FLIPPER LOGIC ---
			// Because every room is generated at X=0, the right edge is always 800.
			if (playerX > 800 - 16) {
				const newRoomCount = roomCount() + 1;
				setRoomCount(newRoomCount);

				// Teleport player back to the left side of the screen
				playerX = 16;
				engine.core.set_position(playerId, playerX, playerY);

				// Cycle Game Modes SYNCHRONOUSLY
				if (newRoomCount % 3 === 0) currentMode = "FLAPPY";
				else if (newRoomCount % 2 === 0) currentMode = "FLIPPER";
				else currentMode = "RPG";

				setMode(currentMode); // Update UI

				// Generate the new room (Always passing 0 for the coordinate offset!)
				generateRoom(0, currentMode, random);
			}

			// 2. DYNAMIC CONTROLS
			const mask = engine.input.getMask();
			if (jumpCooldown > 0) jumpCooldown--;

			if (currentMode === "RPG") {
				let vx = 0;
				if ((mask & 4) !== 0) vx = -6.0;
				if ((mask & 8) !== 0) vx = 6.0;
				engine.core.set_velocity(playerId, vx, NaN);

				if (
					(mask & 1) !== 0 &&
					jumpCooldown <= 0 &&
					engine.core.is_grounded(playerId)
				) {
					engine.core.apply_impulse(playerId, 0, -18.0);
					engine.audio.playSound(2);
					jumpCooldown = 15;
				}
			} else if (currentMode === "FLAPPY") {
				engine.core.set_velocity(playerId, 5.0, NaN);
				if ((mask & 1) !== 0 && jumpCooldown <= 0) {
					engine.core.set_velocity(playerId, NaN, 0);
					engine.core.apply_impulse(playerId, 0, -12.0);
					engine.audio.playSound(2);
					jumpCooldown = 15;
				}
			} else if (currentMode === "FLIPPER") {
				engine.core.set_velocity(playerId, 6.0, NaN);
				if (
					(mask & 1) !== 0 &&
					jumpCooldown <= 0 &&
					engine.core.is_grounded(playerId)
				) {
					isGravityInverted = !isGravityInverted;
					engine.core.invert_gravity(playerId, isGravityInverted);
					engine.audio.playSound(2);
					jumpCooldown = 20;
				}
			}

			// 3. DISCRETE CAMERA LOCK
			// Camera X is always 0 because every room generates at origin!
			engine.core.set_camera(0, 0);

			// 4. DEATH PLANE
			// If the player falls in a pit (Y > 650) or flies into space (Y < -50)
			if (playerY > 650 || playerY < -50) {
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
					<h1>VERDANT DESCENT</h1>
					<p>Infinite Room Flipper</p>
					<button type="button" onClick={startGame} class="play-button">
						START RUN
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
					<div
						style={{
							color: "#f1c40f",
							"font-size": "24px",
							"font-weight": "bold",
						}}
					>
						ROOM: {roomCount()} | MODE: {mode()}
					</div>
					<div>Score: {score()}</div>
					<div>Ticks: {tickCount()}</div>
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
