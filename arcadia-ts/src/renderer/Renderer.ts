import { Application, Container, Sprite, Texture } from "pixi.js";

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
					view: canvas,
					width: 800,
					height: 600,
					backgroundColor: 0x1a1a1a,
				});
			} else {
				// As a very small compatibility fallback, set up the stage renderer manually
				// (this path is unlikely on modern Pixi builds).
				this.app = new Application({
					view: canvas,
					width: 800,
					height: 600,
					backgroundColor: 0x1a1a1a,
				});
			}

			// Add the world container to the stage so camera transforms apply to everything in-world
			this.app?.stage?.addChild(this.worldContainer);

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

		// create a new Sprite using a white 1x1 texture and tint/scale it
		const s = new Sprite(Texture.WHITE) as PixiTaggedSprite;
		s.anchor.set(0.5);

		if (spriteId === 1.0) {
			// Bullet: small yellow square
			s.width = 8;
			s.height = 8;
			s.tint = 0xffff00;
		} else {
			// Player / Obstacle / Wall: larger red square
			s.width = 32;
			s.height = 32;
			s.tint = 0xff0000;
		}

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
