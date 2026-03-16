import { createSignal, onMount } from 'solid-js'
import './App.css'
import { GameLoop } from './engine/GameLoop'
import { Renderer } from './renderer/Renderer'

function App() {
  const [tickCount, setTickCount] = createSignal(0)

  onMount(async () => {
    // import the wasm module and initialize it (captures memory in the returned exports)
    const mod: any = await import('../../arcadia-rs/pkg/arcadia_rs.js')
    const wasmExports: any = (mod && typeof mod.default === 'function') ? await mod.default() : null

    const core: any = new mod.ArcadiaCore()

    // setup renderer
    const renderer = new Renderer()
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
    await renderer.init(canvas)

    // ensure we have access to WASM memory from the init result
    if (!wasmExports || !wasmExports.memory) {
      console.error('WASM exports or memory not available; cannot create zero-copy view')
      return
    }

    // create zero-copy view into WASM memory
    let ptr = Number(core.get_render_buffer_ptr())
    let len = Number(core.get_render_buffer_len())
    let memoryBuffer = wasmExports.memory.buffer
    let memoryView = new Float32Array(memoryBuffer, ptr, len)

    const loop = new GameLoop((dt_ms: number) => {
      core.update(dt_ms)

      // If WASM memory has grown, re-create the Float32Array view.
      if (wasmExports && wasmExports.memory && wasmExports.memory.buffer !== memoryBuffer) {
        memoryBuffer = wasmExports.memory.buffer
        memoryView = new Float32Array(memoryBuffer, ptr, len)
      }

      // draw directly from the zero-copy Float32Array
      renderer.draw(memoryView)
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
