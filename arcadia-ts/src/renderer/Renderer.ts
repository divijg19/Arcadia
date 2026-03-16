import { Application, Graphics } from 'pixi.js'

export class Renderer {
  app: Application | null = null
  square: Graphics | null = null

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
        this.app = new Application({ view: canvas, width: 800, height: 600, background: 0x1a1a1a })
      }

      // Create a red square and add it to the stage. Center the graphic at its origin.
      this.square = new Graphics()
      this.square.beginFill(0xff0000)
      this.square.drawRect(-16, -16, 32, 32)
      this.square.endFill()

      // ensure square is added
      if (this.app && this.app.stage) {
        this.app.stage.addChild(this.square)
      }
    } catch (err) {
      // Log and rethrow so callers can surface the error in the browser console
      // eslint-disable-next-line no-console
      console.error('Renderer.init error', err)
      throw err
    }
  }

  draw(view: Float32Array) {
    if (!this.square) return
    // view layout: [EntityId, X, Y, Rotation, SpriteId]
    const x = view[1]
    const y = view[2]
    // Position the square directly — zero JS->WASM calls here
    this.square.x = x
    this.square.y = y
  }
}
