use hecs::World;
use wasm_bindgen::prelude::*;

mod components;
#[cfg(test)]
mod engine_tests;
pub mod procgen;
pub mod rng;
mod systems;

#[wasm_bindgen]
pub struct ArcadiaCore {
    tick_rate: f64,
    accumulator: f64,
    current_tick: u32,
    render_buffer: Vec<f32>,
    world: World,
    entities: Vec<hecs::Entity>,
    player_input: u8,
    camera_x: f32,
    camera_y: f32,
    mouse_x: f32,
    mouse_y: f32,
    is_mouse_down: bool,
    fire_cooldown: f64,
    event_buffer: Vec<f32>,
    player_health: f32,
    score: f32,
}

impl Default for ArcadiaCore {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl ArcadiaCore {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ArcadiaCore {
        ArcadiaCore {
            tick_rate: 1000.0 / 60.0,
            accumulator: 0.0,
            current_tick: 0,
            render_buffer: Vec::new(),
            world: World::new(),
            entities: Vec::new(),
            player_input: 0,
            camera_x: 0.0,
            camera_y: 0.0,
            mouse_x: 0.0,
            mouse_y: 0.0,
            is_mouse_down: false,
            fire_cooldown: 0.0,
            event_buffer: Vec::new(),
            player_health: 100.0,
            score: 0.0,
        }
    }

    // `spawn_entity` removed in favor of deterministic procedural generation (init_world)

    pub fn spawn_bullet(&mut self, x: f32, y: f32, vx: f32, vy: f32) {
        let ent = self.world.spawn((
            components::Position { x, y },
            components::Velocity { vx, vy },
            components::Renderable {
                sprite_id: 1.0,
                rotation: 0.0,
            },
            components::Collider {
                w: 8.0,
                h: 8.0,
                is_sensor: false,
            },
            components::Tag::Bullet,
            components::Lifetime {
                remaining_ms: 2000.0,
            },
        ));

        self.entities.push(ent);
    }

    // Helper used by tests: spawn a simple player entity (not exported to WASM)
    #[cfg(test)]
    fn spawn_entity(&mut self, x: f32, y: f32) -> hecs::Entity {
        let ent = self.world.spawn((
            components::Position { x, y },
            components::Renderable {
                sprite_id: 0.0,
                rotation: 0.0,
            },
            components::Collider {
                w: 32.0,
                h: 32.0,
                is_sensor: false,
            },
            components::InputReceiver,
            components::Tag::Player,
        ));
        self.entities.push(ent);
        ent
    }

    #[wasm_bindgen]
    pub fn apply_mouse(&mut self, x: f32, y: f32, is_down: bool) {
        self.mouse_x = x;
        self.mouse_y = y;
        self.is_mouse_down = is_down;
    }

    #[wasm_bindgen]
    pub fn init_world(&mut self, seed: u32) {
        // Procedurally generate a deterministic world and capture the spawned entity list
        self.entities = procgen::generate_arena(&mut self.world, seed as u64, 2000.0, 2000.0);
        // Reset camera to origin; the first update() will center on the player
        self.camera_x = 0.0;
        self.camera_y = 0.0;
    }

    #[wasm_bindgen]
    pub fn apply_input(&mut self, input_mask: u8) {
        self.player_input = input_mask;
    }

    pub fn update(&mut self, dt_ms: f64) {
        self.accumulator += dt_ms;
        while self.accumulator >= self.tick_rate {
            // Fixed-timestep tick
            self.current_tick = self.current_tick.wrapping_add(1);

            // Decrease firing cooldown (ms)
            if self.fire_cooldown > 0.0 {
                self.fire_cooldown -= self.tick_rate;
                if self.fire_cooldown < 0.0 {
                    self.fire_cooldown = 0.0;
                }
            }

            // Run ECS systems
            systems::apply_input_system(&mut self.world, self.player_input);

            // Shooting / aiming: if mouse is down and cooldown expired, spawn a bullet towards world mouse
            if self.is_mouse_down && self.fire_cooldown <= 0.0 {
                let mut player_pos: Option<(f32, f32)> = None;
                for (pos, tag) in self
                    .world
                    .query::<(&components::Position, &components::Tag)>()
                    .iter()
                {
                    if *tag == components::Tag::Player {
                        player_pos = Some((pos.x, pos.y));
                        break;
                    }
                }

                if let Some((px, py)) = player_pos {
                    let world_mx = self.mouse_x + self.camera_x;
                    let world_my = self.mouse_y + self.camera_y;
                    let dx = world_mx - px;
                    let dy = world_my - py;
                    let len = (dx * dx + dy * dy).sqrt();

                    if len > 0.0 {
                        let vx = (dx / len) * 15.0; // Bullet speed
                        let vy = (dy / len) * 15.0;
                        self.spawn_bullet(px, py, vx, vy);
                        self.fire_cooldown = 150.0; // Shoot every 150ms
                    }
                }
            }

            systems::movement_system(&mut self.world);

            // Update camera to follow the player (center an 800x600 view)
            for (pos, tag) in self
                .world
                .query::<(&components::Position, &components::Tag)>()
                .iter()
            {
                if *tag == components::Tag::Player {
                    self.camera_x = pos.x - 400.0;
                    self.camera_y = pos.y - 300.0;
                    // Clamp camera so the viewport never shows outside the 2000x2000 world
                    self.camera_x = self.camera_x.clamp(0.0, 2000.0 - 800.0);
                    self.camera_y = self.camera_y.clamp(0.0, 2000.0 - 600.0);
                    break;
                }
            }

            // Run collision detection (bullets vs obstacles) and emit events
            systems::collision_system(&mut self.world, &mut self.event_buffer, &mut self.score);

            // Inspect emitted events and update UI state (e.g., score on BOOM)
            let mut i = 0usize;
            while i + 2 < self.event_buffer.len() {
                let etype = self.event_buffer[i];
                if (etype - 1.0).abs() < f32::EPSILON {
                    // BOOM event: increase score
                    self.score += 10.0;
                }
                i += 3;
            }

            // Run lifetime system to despawn expired entities
            systems::lifetime_system(&mut self.world, self.tick_rate);

            // Keep our entity list in sync with the world (remove despawned entities)
            self.entities.retain(|e| self.world.contains(*e));

            self.accumulator -= self.tick_rate;
        }

        // After processing zero or more fixed ticks, rebuild the flat render buffer
        // [ID, X, Y, Rotation, SpriteId] from all world entities that have a
        // Position + Renderable. Doing this once per update() ensures tests that
        // spawn entities and call `update(0.0)` observe a populated render buffer.
        let mut render_data: Vec<[f32; 5]> = Vec::new();
        for (entity, pos, render) in self
            .world
            .query::<(hecs::Entity, &components::Position, &components::Renderable)>()
            .iter()
        {
            render_data.push([
                entity.id() as f32,
                pos.x,
                pos.y,
                render.rotation,
                render.sprite_id,
            ]);
        }

        // Sort by Y ascending so entities lower on screen (larger Y) render last (on top)
        render_data.sort_by(|a, b| a[2].partial_cmp(&b[2]).unwrap_or(std::cmp::Ordering::Equal));

        self.render_buffer.clear();
        for r in render_data {
            self.render_buffer.push(r[0]);
            self.render_buffer.push(r[1]);
            self.render_buffer.push(r[2]);
            self.render_buffer.push(r[3]);
            self.render_buffer.push(r[4]);
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

    #[wasm_bindgen]
    pub fn get_event_buffer_ptr(&self) -> *const f32 {
        self.event_buffer.as_ptr()
    }

    #[wasm_bindgen]
    pub fn get_event_buffer_len(&self) -> usize {
        self.event_buffer.len()
    }

    #[wasm_bindgen]
    pub fn clear_events(&mut self) {
        self.event_buffer.clear();
    }

    #[wasm_bindgen]
    pub fn get_camera_x(&self) -> f32 {
        self.camera_x
    }

    #[wasm_bindgen]
    pub fn get_camera_y(&self) -> f32 {
        self.camera_y
    }

    #[wasm_bindgen]
    pub fn get_ui_state(&self) -> Vec<f32> {
        vec![self.player_health, self.score]
    }

    #[wasm_bindgen]
    pub fn save_state(&self) -> Vec<u8> {
        // In v1.0, we will fully serialize the ECS hecs::World.
        // For now, we prove postcard + serde works by returning a dummy payload.
        let dummy_data: Vec<u32> = vec![1, 3, 3, 7];
        postcard::to_allocvec(&dummy_data).unwrap_or_else(|_| vec![])
    }
}
