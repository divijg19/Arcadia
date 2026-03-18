import {
	Application,
	Container,
	Graphics,
	Sprite,
	Spritesheet,
	Texture,
} from "pixi.js";

// Minimal type for a JSON texture atlas (only the fields we use)
type AtlasData = {
	frames: Record<
		string,
		{
			frame: { x: number; y: number; w: number; h: number };
			rotated?: boolean;
			trimmed?: boolean;
			spriteSourceSize?: { x: number; y: number; w: number; h: number };
			sourceSize?: { w: number; h: number };
			pivot?: { x: number; y: number };
		}
	>;
	meta: {
		scale: string | number;
		size?: { w: number; h: number };
		image?: string;
		app?: string;
		format?: string;
		version?: string;
	};
};

type PixiAsyncApp = Application & {
	init?: (opts: {
		canvas: HTMLCanvasElement;
		width: number;
		height: number;
		backgroundColor: number;
	}) => Promise<void>;
};

type PixiTaggedSprite = Sprite & { _arcadiaSpriteId?: number };

export class Renderer {
	app: Application | null = null;
	private sheet: Spritesheet | null = null;
	private spriteMap: string[] = [
		"player",
		"bullet",
		"obstacle",
		"wall",
		"pickup",
	];
	private worldContainer: Container = new Container();
	private spritePool: Array<Sprite | undefined> = [];

	async init(canvas: HTMLCanvasElement) {
		try {
			// Prefer a two-step init if available (some builds expose an async init), otherwise construct with view.
			// Create an Application instance and initialize it via the async `init()` API
			// (constructor options are deprecated since Pixi v8).
			const app = new Application() as PixiAsyncApp;
			this.app = app;
			if (typeof app.init === "function") {
				await app.init({
					canvas: canvas,
					width: 800,
					height: 600,
					backgroundColor: 0x1a1a1a,
				});
			} else {
				// As a very small compatibility fallback, set up the stage renderer manually
				// (this path is unlikely on modern Pixi builds).
				this.app = new Application({
					canvas: canvas,
					width: 800,
					height: 600,
					backgroundColor: 0x1a1a1a,
				});
			}

			// Add the world container to the stage so camera transforms apply to everything in-world
			this.app?.stage?.addChild(this.worldContainer);

			// Simulate a single spritesheet atlas containing all frames side-by-side
			if (this.app) {
				const g = new Graphics();

				// Draw shapes into a 160x32 atlas layout (5 tiles of 32x32)
				// "player" at (16,16)
				g.clear();
				g.circle(16, 16, 16);
				g.fill(0x3498db);

				// "bullet" at (48,16) - 8x8 centered -> (44, 12, 8, 8)
				g.rect(44, 12, 8, 8);
				g.fill(0xf1c40f);

				// "obstacle" at (80,16) - 32x32 centered -> (64, 0, 32, 32)
				g.rect(64, 0, 32, 32);
				g.fill(0xe74c3c);

				// "wall" at (112,16) - 32x32 centered -> (96, 0, 32, 32)
				g.rect(96, 0, 32, 32);
				g.fill(0x7f8c8d);
				g.stroke({ width: 2, color: 0x000000 });

				// "pickup" at (144,16) - 16x16 centered -> (136, 8, 16, 16)
				// Draw a small green square to represent a collectible
				g.rect(136, 8, 16, 16);
				g.fill(0x2ecc71);

				// Generate a single texture that contains all frames
				const atlasTexture = this.app.renderer.generateTexture(g);
				const baseTexture = atlasTexture.baseTexture;

				// Define a minimal atlas JSON describing frame rectangles (typed)
				const atlasData: AtlasData = {
					frames: {
						player: { frame: { x: 0, y: 0, w: 32, h: 32 } },
						bullet: { frame: { x: 32, y: 0, w: 32, h: 32 } },
						obstacle: { frame: { x: 64, y: 0, w: 32, h: 32 } },
						wall: { frame: { x: 96, y: 0, w: 32, h: 32 } },
						pickup: { frame: { x: 128, y: 0, w: 32, h: 32 } },
					},
					meta: { scale: "1" },
				};

				// Parse into a Spritesheet so frames can be addressed by name
				this.sheet = new Spritesheet(baseTexture, atlasData);
				await this.sheet.parse();
			}

			// Start with an empty pool; sprites will be allocated lazily by getOrCreateSprite
		} catch (err) {
			// Log and rethrow so callers can surface the error in the browser console
			// eslint-disable-next-line no-console
			console.error("Renderer.init error", err);
			throw err;
		}
	}

	private getOrCreateSprite(index: number, spriteId: number): PixiTaggedSprite {
		const idx = Math.trunc(index);

		// If a sprite already exists at this ID, check if it matches the requested spriteId
		if (this.spritePool[idx]) {
			const existing = this.spritePool[idx] as PixiTaggedSprite;
			if (existing._arcadiaSpriteId === spriteId) {
				return existing;
			} else {
				// Different visual requested; destroy and remove the old one
				try {
					existing.destroy({ children: true, texture: true });
				} catch {
					// ignore
				}
				delete this.spritePool[idx];
			}
		}

		// Create a new Sprite from the spritesheet frame (by name) or fall back to `Texture.WHITE`
		let tex = Texture.WHITE;
		if (this.sheet) {
			const idx = Math.trunc(spriteId);
			const frameName = this.spriteMap[idx];
			if (frameName && this.sheet.textures[frameName]) {
				tex = this.sheet.textures[frameName];
			}
		}
		const s = new Sprite(tex) as PixiTaggedSprite;
		s.anchor.set(0.5);

		// Add the sprite to the world container so camera transforms apply
		this.worldContainer.addChild(s);

		// tag the sprite with its arcadia sprite id for future type checks
		s._arcadiaSpriteId = spriteId;

		// Place sprite at the exact ID index (sparse array allowed)
		this.spritePool[idx] = s;
		return s;
	}

	draw(view: Float32Array, camX: number, camY: number) {
		if (!this.app) return;

		// Apply camera by moving the world container inversely
		this.worldContainer.x = -camX;
		this.worldContainer.y = -camY;

		// Hide all existing pooled sprites first (support sparse pool)
		for (const sprite of this.spritePool) {
			if (sprite) sprite.visible = false;
		}

		// view layout: [EntityId, X, Y, Rotation, SpriteId]
		const entityCount = Math.floor(view.length / 5);

		for (let i = 0; i < entityCount; i++) {
			const offset = i * 5;
			const id = view[offset + 0];
			const idIndex = Math.trunc(id);

			const spriteId = view[offset + 4];
			const sprite = this.getOrCreateSprite(idIndex, spriteId);
			sprite.x = view[offset + 1];
			sprite.y = view[offset + 2];
			sprite.visible = true;
		}
	}
}
