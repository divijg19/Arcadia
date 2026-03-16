import { Application, Graphics, Container } from 'pixi.js'

export class Renderer {
  app: Application | null = null
  private worldContainer: Container = new Container()
  private spritePool: Array<Graphics | undefined> = []

  constructor() {
    // Application will be initialized in init. Keep constructor minimal to avoid side-effects.
  }

  async init(canvas: HTMLCanvasElement) {
    try {
      // Prefer a two-step init if available (some builds expose an async init), otherwise construct with view.
      // Create a placeholder Application instance for environments that support async init.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maybeApp: any = new Application()

      if (typeof maybeApp.init === 'function') {
        // Some PIXI distributions expose an async init API.
        this.app = maybeApp
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.app as any).init({ canvas, width: 800, height: 600, backgroundColor: 0x1a1a1a })
      } else {
        // Fallback to the stable constructor that accepts a view.
        this.app = new Application({ view: canvas, width: 800, height: 600, backgroundColor: 0x1a1a1a })
      }

      // Add the world container to the stage so camera transforms apply to everything in-world
      if (this.app && this.app.stage) {
        this.app.stage.addChild(this.worldContainer)
      }

      // Start with an empty pool; sprites will be allocated lazily by getOrCreateSprite
    } catch (err) {
      // Log and rethrow so callers can surface the error in the browser console
      // eslint-disable-next-line no-console
      console.error('Renderer.init error', err)
      throw err
    }
  }

  private getOrCreateSprite(index: number, spriteId: number): Graphics {
    const idx = Math.trunc(index)

    // If a sprite already exists at this ID, check if it matches the requested spriteId
    if (this.spritePool[idx]) {
      const existing = this.spritePool[idx] as Graphics
      if ((existing as any)._arcadiaSpriteId === spriteId) {
        return existing
      } else {
        // Different visual requested; destroy and remove the old one
        try {
          // `baseTexture` is not a valid option in PIXI destroy options types;
          // remove it to satisfy TypeScript typings.
          existing.destroy({ children: true, texture: true })
        } catch (e) {
          // ignore
        }
        delete this.spritePool[idx]
      }
    }

    // create a new pooled sprite based on spriteId
    const g = new Graphics()

    if (spriteId === 1.0) {
      // Bullet: small yellow square
      g.beginFill(0xffff00)
      g.drawRect(-4, -4, 8, 8)
      g.endFill()
    } else {
      // Player / Obstacle: larger red square
      g.beginFill(0xff0000)
      g.drawRect(-16, -16, 32, 32)
      g.endFill()
    }

    if (this.app && this.app.stage) {
      // Add to the world container so camera transforms apply
      this.worldContainer.addChild(g)
    }

    // tag the sprite with its arcadia sprite id for future type checks
    ;(g as any)._arcadiaSpriteId = spriteId

    // Place sprite at the exact ID index (sparse array allowed)
    this.spritePool[idx] = g
    return g
  }

  draw(view: Float32Array, camX: number, camY: number) {
    if (!this.app) return

    // Apply camera by moving the world container inversely
    this.worldContainer.x = -camX
    this.worldContainer.y = -camY

    // Hide all existing pooled sprites first (support sparse pool)
    for (const sprite of this.spritePool) {
      if (sprite) sprite.visible = false
    }

    // view layout: [EntityId, X, Y, Rotation, SpriteId]
    const entityCount = Math.floor(view.length / 5)

    for (let i = 0; i < entityCount; i++) {
      const offset = i * 5
      const id = view[offset + 0]
      const idIndex = Math.trunc(id)

      const spriteId = view[offset + 4]
      const sprite = this.getOrCreateSprite(idIndex, spriteId)
      sprite.x = view[offset + 1]
      sprite.y = view[offset + 2]
      sprite.visible = true
    }
  }
}
