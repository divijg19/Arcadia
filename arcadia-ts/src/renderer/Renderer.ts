import { Application, Container, Graphics, Sprite, Texture } from "pixi.js";

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
	private textures: Record<number, Texture> = {};
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

			// Generate and cache textures for each sprite id so we don't recreate them per-frame
			if (this.app) {
				const g = new Graphics();

				// 0.0 - Player (Blue Circle)
				g.clear();
				g.circle(0, 0, 16);
				g.fill(0x3498db);
				this.textures[0] = this.app.renderer.generateTexture(g);

				// 1.0 - Bullet (Yellow Star/Small Square)
				g.clear();
				g.rect(-4, -4, 8, 8);
				g.fill(0xf1c40f);
				this.textures[1] = this.app.renderer.generateTexture(g);

				// 2.0 - Obstacle (Red Square)
				g.clear();
				g.rect(-16, -16, 32, 32);
				g.fill(0xe74c3c);
				this.textures[2] = this.app.renderer.generateTexture(g);

				// 3.0 - Wall (Dark Gray Square with border)
				g.clear();
				g.rect(-16, -16, 32, 32);
				g.fill(0x7f8c8d);
				g.stroke({ width: 2, color: 0x000000 });
				this.textures[3] = this.app.renderer.generateTexture(g);
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

		// Create a new Sprite from the cached texture for this spriteId
		const tex = this.textures[spriteId] || Texture.WHITE;
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
