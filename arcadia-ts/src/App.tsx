import { createSignal, onMount } from 'solid-js'
import './App.css'

function App() {
  const [version, setVersion] = createSignal('Loading Arcadia...')

  onMount(async () => {
    // dynamic import from the wasm-pack output
    const wasm = await import('../../arcadia-rs/pkg/arcadia_rs.js')
    // Initialize the WASM module (default export)
    if (wasm && typeof wasm.default === 'function') {
      await wasm.default()
    }
    setVersion(wasm.get_engine_version())
  })

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>{version()}</h1>
    </div>
  )
}

export default App
