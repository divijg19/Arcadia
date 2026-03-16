import { createSignal, onMount } from 'solid-js'
import './App.css'
import { GameLoop } from './engine/GameLoop'
import { Renderer } from './renderer/Renderer'
import { InputManager } from './input/InputManager'

function App() {
  const [tickCount, setTickCount] = createSignal(0)

  onMount(async () => {
    // import the wasm module and initialize it (captures memory in the returned exports)
    const mod: any = await import('../../arcadia-rs/pkg/arcadia_rs.js')
    const wasmExports: any = (mod && typeof mod.default === 'function') ? await mod.default() : null

    const core: any = new mod.ArcadiaCore()

    // input manager (maps keyboard state to a bitmask)
    const inputManager = new InputManager()

    // setup renderer
    const renderer = new Renderer()
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
    await renderer.init(canvas)

    // ensure we have access to WASM memory from the init result
    if (!wasmExports || !wasmExports.memory) {
      console.error('WASM exports or memory not available; cannot create zero-copy view')
      return
    }

    // Spawn player (entity 0) and 99 static entities to test dynamic resizing
    core.spawn_entity(400, 300)
    for (let i = 0; i < 99; i++) {
      core.spawn_entity(Math.random() * 800, Math.random() * 600)
    }

    // create zero-copy view lazily inside the loop to handle WASM memory growth / reallocations
    let memoryView: Float32Array | null = null

    const loop = new GameLoop((dt_ms: number) => {
      // read input mask from TS InputManager and apply to Rust core
      const mask = inputManager.getMask()
      core.apply_input(mask)

      core.update(dt_ms)

      // Check if view needs to be recreated (due to WASM memory growth or vector reallocation)
      const ptr = Number(core.get_render_buffer_ptr())
      const len = Number(core.get_render_buffer_len())
      if (
        !memoryView ||
        memoryView.buffer !== wasmExports.memory.buffer ||
        memoryView.byteOffset !== ptr ||
        memoryView.length !== len
      ) {
        memoryView = new Float32Array(wasmExports.memory.buffer, ptr, len)
      }

      // draw directly from the zero-copy Float32Array
      renderer.draw(memoryView as Float32Array)
      setTickCount(core.get_tick_count())
    })

    loop.start()
  })

  return (
    <div class="app-root">
      <canvas id="game-canvas" width="800" height="600"></canvas>
      <div class="tick-counter">Ticks: {tickCount()}</div>
    </div>
  )
}

export default App
