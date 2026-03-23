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
		{ name: string; description: string; isCollectible: boolean }
	>();

	const engine = new ArcadiaEngine();

	onMount(async () => {
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		await engine.init(canvas);

		// UI Click Handler (Bypasses normal input mapping)
		canvas.addEventListener("mousedown", (e) => {
			if (scene() !== "GAME") return;

			// Convert Screen to World
			const rect = canvas.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			const worldX = mouseX + engine.core.get_camera_x();
			const worldY = mouseY + engine.core.get_camera_y();

			// Query Rust for the clicked entity!
			const clickedId = engine.core.query_point(worldX, worldY);

			if (clickedId !== -1.0) {
				const item = interactables.get(Math.trunc(clickedId));
				if (item) {
					setDialogue(item.description);
					engine.audio.playSound(2); // Ping

					if (item.isCollectible) {
						setInventory([...inventory(), item.name]);
						engine.core.apply_despawns(new Float32Array([clickedId]));
						interactables.delete(Math.trunc(clickedId));
					}
				}
			} else {
				setDialogue(null); // Clicked empty space, close dialogue
			}
		});
	});

	const startGame = () => {
		setScene("GAME");

		// Spawn a static "Escape Room" scene
		engine.core.set_camera(0, 0); // Lock camera at origin

		// Desk (Obstacle)
		const deskId = engine.core.spawn(
			400,
			300,
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
			description: "An old mahogany desk. One drawer is locked.",
			isCollectible: false,
		});

		// Painting (Obstacle)
		const paintingId = engine.core.spawn(
			400,
			100,
			0,
			0,
			120,
			80,
			false,
			2,
			1,
			3.0,
			TAG_OBSTACLE,
			0,
		);
		interactables.set(paintingId, {
			name: "Painting",
			description:
				"A painting of the Hanging Gardens. There is something behind it...",
			isCollectible: false,
		});

		// Rusty Key (Pickup - Z-Indexed on top of the desk)
		const keyId = engine.core.spawn(
			450,
			280,
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
			description: "You found a Rusty Key!",
			isCollectible: true,
		});

		// Start a dummy loop just to render the static scene
		engine.onTick = () => {};
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
