use hecs::World;
use wasm_bindgen::prelude::*;

mod components;
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
        }
    }

    #[wasm_bindgen]
    pub fn spawn_entity(&mut self, x: f32, y: f32) {
        // If this is the first entity, give it InputReceiver so it becomes the player
        let ent = if self.world.len() == 0 {
            self.world.spawn((
                components::Position { x, y },
                components::Velocity { vx: 0.0, vy: 0.0 },
                components::Renderable {
                    sprite_id: 0.0,
                    rotation: 0.0,
                },
                components::InputReceiver,
            ))
        } else {
            self.world.spawn((
                components::Position { x, y },
                components::Velocity { vx: 0.0, vy: 0.0 },
                components::Renderable {
                    sprite_id: 0.0,
                    rotation: 0.0,
                },
            ))
        };

        self.entities.push(ent);
    }

    #[wasm_bindgen]
    pub fn spawn_bullet(&mut self, x: f32, y: f32, vx: f32, vy: f32) {
        let ent = self.world.spawn((
            components::Position { x, y },
            components::Velocity { vx, vy },
            components::Renderable {
                sprite_id: 1.0,
                rotation: 0.0,
            },
            components::Lifetime {
                remaining_ms: 2000.0,
            },
        ));

        self.entities.push(ent);
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

            // Run ECS systems
            systems::apply_input_system(&mut self.world, self.player_input);
            systems::movement_system(&mut self.world);

            // Run lifetime system to despawn expired entities
            systems::lifetime_system(&mut self.world, self.tick_rate);

            // Keep our entity list in sync with the world (remove despawned entities)
            self.entities.retain(|e| self.world.contains(*e));

            // Rebuild the flat render buffer [ID, X, Y, Rotation, SpriteId]
            self.render_buffer.clear();
            for entity in &self.entities {
                if let Ok((pos, render)) = self
                    .world
                    .query_one_mut::<(&components::Position, &components::Renderable)>(*entity)
                {
                    let id = entity.id() as f32;
                    self.render_buffer.push(id);
                    self.render_buffer.push(pos.x);
                    self.render_buffer.push(pos.y);
                    self.render_buffer.push(render.rotation);
                    self.render_buffer.push(render.sprite_id);
                }
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
