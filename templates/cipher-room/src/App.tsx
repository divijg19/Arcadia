import { createSignal, onMount, Show } from "solid-js";
import "./App.css";
import { ArcadiaEngine } from "arcadia-ts";

type SceneState = "MENU" | "GAME";

// Puzzle Game Constants
const TAG_OBSTACLE = 1;
const TAG_PICKUP = 4;

function App() {
	const [scene, setScene] = createSignal<SceneState>("MENU");
	const [dialogue, setDialogue] = createSignal<string | null>(null);
	const [inventory, setInventory] = createSignal<string[]>([]);

	// We will map Rust Entity IDs to human-readable interactive data
	const interactables = new Map<
		number,
		{
			name: string;
			description: string;
			isCollectible: boolean;
			clicks: number;
		}
	>();

	const engine = new ArcadiaEngine();

	onMount(async () => {
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		await engine.init(canvas);

		// UI Click Handler (Bypasses normal input mapping)
		canvas.addEventListener("mousedown", (e) => {
			if (scene() !== "GAME") return;

			const rect = canvas.getBoundingClientRect();
			const worldX = e.clientX - rect.left + engine.core.get_camera_x();
			const worldY = e.clientY - rect.top + engine.core.get_camera_y();

			const clickedId = engine.core.query_point(worldX, worldY);

			if (clickedId !== -1.0) {
				const item = interactables.get(Math.trunc(clickedId));
				if (item) {
					// --- MULTI-STEP PUZZLE LOGIC ---

					// Puzzle 1: Move the Painting (Requires 3 Clicks)
					if (item.name === "Painting") {
						// First interaction shows an initial inspection message, counter starts afterwards
						if (item.clicks === 0) {
							// Show the original description on first interaction, then start the counter
							item.clicks = 1;
							setDialogue(item.description);
							engine.audio.playSound(1); // Thud
							return;
						}

						// Subsequent clicks increment the counter and show progress
						item.clicks += 1;
						if (item.clicks < 3) {
							setDialogue(
								`The painting shifts slightly upon touching it... Maybe try clicking it a few more times?`,
							);
							engine.audio.playSound(1); // Thud
						} else {
							// Third click: reveal
							setDialogue(
								"You shifted the painting. Something was hidden behind it!",
							);
							engine.audio.playSound(2); // Ping
							// Move the painting out of the way to reveal the key!
							engine.core.set_velocity(clickedId, 0, -200);
							interactables.delete(Math.trunc(clickedId));
						}
						return;
					}

					// Puzzle 2: Unlock the Desk
					if (item.name === "Desk") {
						if (inventory().includes("Rusty Key")) {
							setDialogue(
								"The Rusty Key fit! Inside the drawer, you found a Diary.",
							);
							engine.audio.playSound(2);
							setInventory([...inventory(), "Diary"]);
							// Remove the key from inventory
							setInventory((inv) => inv.filter((i) => i !== "Rusty Key"));
						} else {
							setDialogue(item.description);
							engine.audio.playSound(1); // Thud
						}
						return;
					}

					// Standard Collectible Logic
					setDialogue(item.description);
					engine.audio.playSound(2);

					if (item.isCollectible) {
						setInventory([...inventory(), item.name]);
						engine.core.apply_despawns(new Float32Array([clickedId]));
						interactables.delete(Math.trunc(clickedId));
					}
				}
			} else {
				setDialogue(null);
			}
		});
	});

	const startGame = () => {
		setScene("GAME");
		engine.core.set_camera(0, 0);

		// 1. The Desk (Obstacle)
		const deskId = engine.core.spawn(
			400,
			400,
			0,
			0,
			200,
			100,
			false,
			2,
			1,
			3.0,
			TAG_OBSTACLE,
			0,
		);
		interactables.set(deskId, {
			name: "Desk",
			description: "An old mahogany desk. One drawer is locked tight.",
			isCollectible: false,
			clicks: 0,
		});

		// 2. The Key (Pickup) - Hidden BEHIND the painting! (Spawned first so its Z-Index/Y is lower)
		const keyId = engine.core.spawn(
			600,
			150,
			0,
			0,
			32,
			32,
			true,
			8,
			0,
			4.0,
			TAG_PICKUP,
			0,
		);
		interactables.set(keyId, {
			name: "Rusty Key",
			description: "A small, rusted brass key.",
			isCollectible: true,
			clicks: 0,
		});

		// 3. The Painting (Obstacle) - Spawned in front of the key
		// Painting Y is slightly larger so it renders on top of the key until moved
		const paintingId = engine.core.spawn(
			600,
			170,
			0,
			0,
			120,
			160,
			false,
			2,
			1,
			3.0,
			TAG_OBSTACLE,
			0,
		);
		interactables.set(paintingId, {
			name: "Painting",
			description: "A painting of the Hanging Gardens. It looks loose...",
			isCollectible: false,
			clicks: 0,
		});

		engine.onTick = () => { };
		engine.start();
	};

	return (
		<div class="app-root" style={{ position: "relative" }}>
			{/* Canvas is ALWAYS in the DOM so onMount can attach PixiJS to it */}
			<canvas
				id="game-canvas"
				width="800"
				height="600"
				style={{ display: "block", cursor: "pointer" }}
			></canvas>

			<Show when={scene() === "MENU"}>
				<div class="menu-screen">
					<h1>BABYLON ESTATE</h1>
					<p>An Arcadia Puzzle Adventure</p>
					<button type="button" onClick={startGame} class="play-button">
						ENTER ROOM
					</button>
				</div>
			</Show>

			<Show when={scene() === "GAME"}>
				{/* SolidJS UI Overlay for Inventory */}
				<div
					style={{
						position: "absolute",
						top: "20px",
						right: "20px",
						background: "rgba(0,0,0,0.8)",
						padding: "20px",
						color: "white",
						border: "2px solid #f1c40f",
					}}
				>
					<h3>Inventory</h3>
					<ul>
						{inventory().length === 0 ? (
							<li>Empty</li>
						) : (
							inventory().map((i) => <li>{i}</li>)
						)}
					</ul>
				</div>

				{/* SolidJS UI Overlay for Dialogue */}
				<Show when={dialogue()}>
					<div
						style={{
							position: "absolute",
							bottom: "40px",
							left: "10%",
							right: "10%",
							background: "rgba(0,0,0,0.9)",
							padding: "30px",
							color: "white",
							"font-size": "24px",
							border: "4px solid #3498db",
							"border-radius": "10px",
							"text-align": "center",
						}}
					>
						{dialogue()}
					</div>
				</Show>
			</Show>
		</div>
	);
}

export default App;
