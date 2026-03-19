import {
	Application,
	Container,
	Graphics,
	Rectangle,
	Sprite,
	Texture,
} from "pixi.js";

type PixiAsyncApp = Application & {
	init?: (opts: {
		canvas: HTMLCanvasElement;
		width: number;
		height: number;
		backgroundColor: number;
		premultipliedAlpha?: boolean;
	}) => Promise<void>;
};

type PixiTaggedSprite = Sprite & { _arcadiaSpriteId?: number };

export class Renderer {
	app: Application | null = null;
	private textures: Record<string, Texture> = {};
	private spriteMap: string[] = [
		"player",
		"bullet",
		"obstacle",
		"wall",
		"pickup",
	];
	private worldContainer: Container = new Container();
	private spritePool: Array<PixiTaggedSprite | undefined> = [];

	async init(canvas: HTMLCanvasElement) {
		try {
			const app = new Application() as PixiAsyncApp;
			this.app = app;

			// Explicitly disable preferences that cause WebGL warnings on raw data uploads
			if (typeof app.init === "function") {
				await app.init({
					canvas: canvas,
					width: 800,
					height: 600,
					backgroundColor: 0x1a1a1a,
					premultipliedAlpha: false,
				});
			} else {
				this.app = new Application({
					view: canvas,
					width: 800,
					height: 600,
					backgroundColor: 0x1a1a1a,
					premultipliedAlpha: false,
				});
			}

			this.app?.stage?.addChild(this.worldContainer);

			if (this.app) {
				// 1. Generate the master Atlas Graphic
				const g = new Graphics();

				// "player" at (16, 16)
				g.beginFill(0x3498db);
				g.drawCircle(16, 16, 16);
				g.endFill();

				// "bullet" at (48, 16) -> (44, 12, 8, 8)
				g.beginFill(0xf1c40f);
				g.drawRect(44, 12, 8, 8);
				g.endFill();

				// "obstacle" at (80, 16) -> (64, 0, 32, 32)
				g.beginFill(0xe74c3c);
				g.drawRect(64, 0, 32, 32);
				g.endFill();

				// "wall" at (112, 16) -> (96, 0, 32, 32)
				g.beginFill(0x7f8c8d);
				g.drawRect(96, 0, 32, 32);
				g.endFill();
				g.lineStyle(2, 0x000000);
				g.drawRect(96, 0, 32, 32);

				// "pickup" at (144, 16) -> (136, 8, 16, 16)
				g.beginFill(0x2ecc71);
				g.drawRect(136, 8, 16, 16);
				g.endFill();

				// Render the atlas into a DOM canvas to ensure a DOM-backed
				// upload (avoids ImageBitmap/non-DOM texImage deprecation warnings).
				const atlasCanvas = (
					this.app.renderer.extract as unknown as {
						canvas: (displayObject: unknown) => HTMLCanvasElement;
					}
				).canvas(g);

				// Create a Texture from the DOM-canvas atlas. Use an `any` cast to
				// satisfy the typing for Texture.from and obtain a Pixi TextureSource
				// which we can re-use for frame-backed textures.
				const masterTex = Texture.from(atlasCanvas);
				const masterSource = masterTex.source;

				// 2. Define individual Texture Frames directly from the master source
				this.textures.player = new Texture({
					source: masterSource,
					frame: new Rectangle(0, 0, 32, 32),
				});
				this.textures.bullet = new Texture({
					source: masterSource,
					frame: new Rectangle(32, 0, 32, 32),
				});
				this.textures.obstacle = new Texture({
					source: masterSource,
					frame: new Rectangle(64, 0, 32, 32),
				});
				this.textures.wall = new Texture({
					source: masterSource,
					frame: new Rectangle(96, 0, 32, 32),
				});
				this.textures.pickup = new Texture({
					source: masterSource,
					frame: new Rectangle(128, 0, 32, 32),
				});

				// 3. Force GPU upload to prevent lazy initialization warnings by
				// initializing each texture's source via the renderer texture system.
				try {
					const rendererLike = this.app.renderer as unknown as
						| { texture?: { init?: (s: unknown) => void } }
						| undefined;
					if (
						rendererLike?.texture &&
						typeof rendererLike.texture.init === "function"
					) {
						const texs = [
							this.textures.player,
							this.textures.bullet,
							this.textures.obstacle,
							this.textures.wall,
							this.textures.pickup,
						];
						for (const t of texs) {
							const src = t.source ?? masterSource;
							try {
								if (src) rendererLike.texture.init(src);
							} catch {
								/* ignore per-texture failures */
							}
						}
					}
				} catch {
					// ignore
				}
			}
		} catch (err) {
			console.error("Renderer.init error", err);
			throw err;
		}
	}

	private getOrCreateSprite(index: number, spriteId: number): PixiTaggedSprite {
		const idx = Math.trunc(index);

		if (this.spritePool[idx]) {
			const existing = this.spritePool[idx] as PixiTaggedSprite;
			if (existing._arcadiaSpriteId === spriteId) {
				return existing;
			} else {
				try {
					existing.destroy({ children: true, texture: false });
				} catch {
					/* ignore */
				}
				delete this.spritePool[idx];
			}
		}

		const frameName = this.spriteMap[Math.trunc(spriteId)] || this.spriteMap[0];
		const tex = this.textures[frameName] || Texture.WHITE;

		const s = new Sprite(tex) as PixiTaggedSprite;
		s.anchor.set(0.5);
		this.worldContainer.addChild(s);

		s._arcadiaSpriteId = spriteId;
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
