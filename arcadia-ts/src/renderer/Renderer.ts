import { Application, Container, Graphics } from "pixi.js";

type PixiAsyncApp = Application & {
	init?: (opts: {
		canvas: HTMLCanvasElement;
		width: number;
		height: number;
		backgroundColor: number;
	}) => Promise<void>;
};

type PixiTaggedGraphics = Graphics & { _arcadiaSpriteId?: number };

export class Renderer {
	app: Application | null = null;
	private worldContainer: Container = new Container();
	private spritePool: Array<Graphics | undefined> = [];

	/**
	 * Draw a filled rectangle using the modern PIXI API when available
	 * (fillStyle + fillRect), otherwise fall back to beginFill/drawRect/endFill.
	 */
	private drawFilledRect(
		g: PixiTaggedGraphics,
		x: number,
		y: number,
		w: number,
		h: number,
		color: number,
	) {
		const maybeNewApi = g as unknown as {
			fillStyle?: (opts: { color: number; alpha?: number }) => void;
			fillRect?: (x: number, y: number, w: number, h: number) => void;
		};

		if (
			typeof maybeNewApi.fillStyle === "function" &&
			typeof maybeNewApi.fillRect === "function"
		) {
			maybeNewApi.fillStyle({ color });
			maybeNewApi.fillRect(x, y, w, h);
			return;
		}

		// Fallback for older PIXI versions
		g.beginFill(color);
		g.drawRect(x, y, w, h);
		g.endFill();
	}

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

	private getOrCreateSprite(
		index: number,
		spriteId: number,
	): PixiTaggedGraphics {
		const idx = Math.trunc(index);

		// If a sprite already exists at this ID, check if it matches the requested spriteId
		if (this.spritePool[idx]) {
			const existing = this.spritePool[idx] as PixiTaggedGraphics;
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

		// create a new pooled sprite based on spriteId
		const g = new Graphics() as PixiTaggedGraphics;

		if (spriteId === 1.0) {
			// Bullet: small yellow square
			this.drawFilledRect(g, -4, -4, 8, 8, 0xffff00);
		} else {
			// Player / Obstacle: larger red square
			this.drawFilledRect(g, -16, -16, 32, 32, 0xff0000);
		}

		// Add the sprite to the world container so camera transforms apply
		// (worldContainer is added once in init)
		this.worldContainer.addChild(g);

		// tag the sprite with its arcadia sprite id for future type checks
		(g as PixiTaggedGraphics)._arcadiaSpriteId = spriteId;

		// Place sprite at the exact ID index (sparse array allowed)
		this.spritePool[idx] = g;
		return g;
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
