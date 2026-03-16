use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ArcadiaCore {
    tick_rate: f64,
    accumulator: f64,
    current_tick: u32,
}

#[wasm_bindgen]
impl ArcadiaCore {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ArcadiaCore {
        ArcadiaCore {
            tick_rate: 1000.0 / 60.0,
            accumulator: 0.0,
            current_tick: 0,
        }
    }

    pub fn update(&mut self, dt_ms: f64) {
        self.accumulator += dt_ms;
        while self.accumulator >= self.tick_rate {
            self.current_tick = self.current_tick.wrapping_add(1);
            self.accumulator -= self.tick_rate;
        }
    }

    pub fn get_tick_count(&self) -> u32 {
        self.current_tick
    }
}
