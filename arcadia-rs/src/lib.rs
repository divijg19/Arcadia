use wasm_bindgen::prelude::*;

// Input bitmask constants
const UP: u8 = 1;
const DOWN: u8 = 2;
const LEFT: u8 = 4;
const RIGHT: u8 = 8;

#[wasm_bindgen]
pub struct ArcadiaCore {
    tick_rate: f64,
    accumulator: f64,
    current_tick: u32,
    render_buffer: Vec<f32>,
    current_input: u8,
}

#[wasm_bindgen]
impl ArcadiaCore {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ArcadiaCore {
        ArcadiaCore {
            tick_rate: 1000.0 / 60.0,
            accumulator: 0.0,
            current_tick: 0,
            // [EntityId, X, Y, Rotation, SpriteId] - start centered
            render_buffer: vec![1.0, 400.0, 300.0, 0.0, 0.0],
            current_input: 0,
        }
    }

    pub fn apply_input(&mut self, input_mask: u8) {
        self.current_input = input_mask;
    }

    pub fn update(&mut self, dt_ms: f64) {
        self.accumulator += dt_ms;
        while self.accumulator >= self.tick_rate {
            // Fixed-timestep tick
            self.current_tick = self.current_tick.wrapping_add(1);

            // Movement per tick (pixels per tick)
            let speed: f32 = 5.0;

            // buffer layout: [EntityId, X, Y, Rotation, SpriteId]
            if self.render_buffer.len() >= 3 {
                let mut x = self.render_buffer[1];
                let mut y = self.render_buffer[2];

                if (self.current_input & UP) != 0 {
                    y -= speed;
                }
                if (self.current_input & DOWN) != 0 {
                    y += speed;
                }
                if (self.current_input & LEFT) != 0 {
                    x -= speed;
                }
                if (self.current_input & RIGHT) != 0 {
                    x += speed;
                }

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
