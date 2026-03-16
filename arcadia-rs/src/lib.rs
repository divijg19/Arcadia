use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ArcadiaCore {
    tick_rate: f64,
    accumulator: f64,
    current_tick: u32,
    render_buffer: Vec<f32>,
}

#[wasm_bindgen]
impl ArcadiaCore {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ArcadiaCore {
        ArcadiaCore {
            tick_rate: 1000.0 / 60.0,
            accumulator: 0.0,
            current_tick: 0,
            render_buffer: vec![1.0, 0.0, 0.0, 0.0, 0.0],
        }
    }

    pub fn update(&mut self, dt_ms: f64) {
        self.accumulator += dt_ms;
        while self.accumulator >= self.tick_rate {
            self.current_tick = self.current_tick.wrapping_add(1);
            // update a single entity's position in the render buffer to move in a circle
            let angle = (self.current_tick as f32) * (2.0 * std::f32::consts::PI) / 60.0_f32;
            let center_x: f32 = 400.0;
            let center_y: f32 = 300.0;
            let radius: f32 = 100.0;
            let x = center_x + radius * angle.cos();
            let y = center_y + radius * angle.sin();
            // buffer layout: [EntityId, X, Y, Rotation, SpriteId]
            if self.render_buffer.len() >= 3 {
                self.render_buffer[1] = x;
                self.render_buffer[2] = y;
            }
            self.accumulator -= self.tick_rate;
        }
    }

    pub fn get_tick_count(&self) -> u32 {
        self.current_tick
    }

    pub fn get_render_buffer_ptr(&self) -> *const f32 {
        self.render_buffer.as_ptr()
    }

    pub fn get_render_buffer_len(&self) -> usize {
        self.render_buffer.len()
    }
}
