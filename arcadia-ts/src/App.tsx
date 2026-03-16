import { createSignal, onMount } from 'solid-js'
import './App.css'
import { GameLoop } from './engine/GameLoop'

function App() {
  const [tickCount, setTickCount] = createSignal(0)

  onMount(async () => {
    // dynamic import from the wasm-pack output
    const wasm: any = await import('../../arcadia-rs/pkg/arcadia_rs.js')
    // Initialize the WASM module (default export)
    if (wasm && typeof wasm.default === 'function') {
      await wasm.default()
    }

    const core: any = new wasm.ArcadiaCore()

    const loop = new GameLoop((dt_ms: number) => {
      core.update(dt_ms)
      setTickCount(core.get_tick_count())
    })

    loop.start()
  })

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace', fontSize: '2rem' }}>
        {tickCount()}
      </div>
    </div>
  )
}

export default App
