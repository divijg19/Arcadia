import { createSignal, onMount, Show } from "solid-js";
import "./App.css";
import { ArcadiaEngine } from "./engine/ArcadiaEngine";

type SceneState = "MENU" | "GAME";

function App() {
	const [scene, setScene] = createSignal<SceneState>("MENU");
	const [tickCount, setTickCount] = createSignal(0);
	const [score, setScore] = createSignal(0);

	const engine = new ArcadiaEngine();

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

		engine.onTick = (ticks) => {
			setTickCount(ticks);
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
		engine.start(seed);
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
