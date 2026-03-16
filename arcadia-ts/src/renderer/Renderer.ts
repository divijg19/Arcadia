import { Application, Graphics } from 'pixi.js'

export class Renderer {
  app: Application | null = null
  private spritePool: Graphics[] = []

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

      // Start with an empty pool; sprites will be allocated lazily by getOrCreateSprite
    } catch (err) {
      // Log and rethrow so callers can surface the error in the browser console
      // eslint-disable-next-line no-console
      console.error('Renderer.init error', err)
      throw err
    }
  }

  private getOrCreateSprite(index: number): Graphics {
    if (this.spritePool[index]) return this.spritePool[index]

    // create a new pooled sprite
    const g = new Graphics()
    g.beginFill(0xff0000)
    g.drawRect(-16, -16, 32, 32)
    g.endFill()

    if (this.app && this.app.stage) {
      this.app.stage.addChild(g)
    }

    this.spritePool.push(g)
    return g
  }

  draw(view: Float32Array) {
    if (!this.app) return

    // view layout: [EntityId, X, Y, Rotation, SpriteId]
    const entityCount = Math.floor(view.length / 5)

    for (let i = 0; i < entityCount; i++) {
      const offset = i * 5
      const sprite = this.getOrCreateSprite(i)
      sprite.x = view[offset + 1]
      sprite.y = view[offset + 2]
      sprite.visible = true
    }

    // hide unused pooled sprites
    for (let i = entityCount; i < this.spritePool.length; i++) {
      const s = this.spritePool[i]
      if (s) s.visible = false
    }
  }
}
