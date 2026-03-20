use hecs::World;
use wasm_bindgen::prelude::*;

mod components;
#[cfg(test)]
mod engine_tests;
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
    contact_buffer: Vec<f32>,
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

            contact_buffer: Vec::new(),
            player_health: 100.0,
            score: 0.0,
        }
    }

    // Generic spawn function exposed to WASM/JS. This replaces the previous
    // higher-level helpers like `spawn_bullet`/`spawn_entity` and moves all
    // procedural level generation into the embedding (TypeScript).
    #[allow(clippy::too_many_arguments)]
    #[wasm_bindgen]
    pub fn spawn(
        &mut self,
        x: f32,
        y: f32,
        vx: f32,
        vy: f32,
        w: f32,
        h: f32,
        is_sensor: bool,
        layer: u8,
        mask: u8,
        sprite_id: f32,
        tag_id: u8,
        lifetime_ms: f64,
    ) -> u32 {
        let tag = match tag_id {
            0 => components::Tag::Player,
            1 => components::Tag::Obstacle,
            2 => components::Tag::Bullet,
            3 => components::Tag::Wall,
            4 => components::Tag::Pickup,
            _ => components::Tag::Obstacle,
        };

        let mut builder = hecs::EntityBuilder::new();
        builder.add(components::Position { x, y });
        builder.add(components::Velocity { vx, vy });
        builder.add(components::Renderable {
            sprite_id,
            rotation: 0.0,
        });
        builder.add(components::Collider {
            w,
            h,
            is_sensor,
            layer,
            mask,
        });
        builder.add(tag);

        // Temporary: We still rely on InputReceiver for the movement system.
        // This will be removed in v1.0.2.
        if tag == components::Tag::Player {
            builder.add(components::InputReceiver);
        }

        if lifetime_ms > 0.0 {
            builder.add(components::Lifetime {
                remaining_ms: lifetime_ms,
            });
        }

        let ent = self.world.spawn(builder.build());
        self.entities.push(ent);

        ent.id()
    }

    #[wasm_bindgen]
    pub fn apply_mouse(&mut self, x: f32, y: f32, is_down: bool) {
        self.mouse_x = x;
        self.mouse_y = y;
        self.is_mouse_down = is_down;
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

            // Run collision detection -> get raw contact pairs; serialize to flat contact_buffer
            let contacts = systems::collision_system(&mut self.world);

            self.contact_buffer.clear();
            for (e1, e2) in contacts {
                let tag1 = self.world.get::<&components::Tag>(e1).ok().map(|r| *r);
                let tag2 = self.world.get::<&components::Tag>(e2).ok().map(|r| *r);

                if let (Some(t1), Some(t2)) = (tag1, tag2) {
                    self.contact_buffer.push(e1.id() as f32);
                    self.contact_buffer.push(t1 as u8 as f32);
                    self.contact_buffer.push(e2.id() as f32);
                    self.contact_buffer.push(t2 as u8 as f32);
                }
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
    pub fn get_contact_buffer_ptr(&self) -> *const f32 {
        self.contact_buffer.as_ptr()
    }

    #[wasm_bindgen]
    pub fn get_contact_buffer_len(&self) -> usize {
        self.contact_buffer.len()
    }

    #[wasm_bindgen]
    pub fn apply_despawns(&mut self, ids_to_despawn: &[f32]) {
        for &id_float in ids_to_despawn {
            let target_id = id_float as u32;
            if let Some(&entity) = self.entities.iter().find(|e| e.id() == target_id) {
                let _ = self.world.despawn(entity).ok();
            }
        }
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
        // Build a snapshot containing global state + a serialized view of each entity
        let mut snapshot = components::WorldSnapshot {
            tick: self.current_tick,
            score: self.score,
            health: self.player_health,
            entities: Vec::with_capacity(self.world.len() as usize),
        };

        // Extract components from every entity present in the world. Use Option<&T>
        // in the query so missing components map to `None` in the snapshot.
        for (_entity, pos_opt, vel_opt, render_opt, collider_opt, tag_opt, input_opt, life_opt) in
            self.world
                .query::<(
                    hecs::Entity,
                    Option<&components::Position>,
                    Option<&components::Velocity>,
                    Option<&components::Renderable>,
                    Option<&components::Collider>,
                    Option<&components::Tag>,
                    Option<&components::InputReceiver>,
                    Option<&components::Lifetime>,
                )>()
                .iter()
        {
            snapshot.entities.push(components::EntitySnapshot {
                pos: pos_opt.copied(),
                vel: vel_opt.copied(),
                render: render_opt.copied(),
                collider: collider_opt.copied(),
                tag: tag_opt.copied(),
                input_recv: input_opt.is_some(),
                lifetime: life_opt.copied(),
            });
        }

        postcard::to_allocvec(&snapshot).unwrap_or_else(|_| vec![])
    }

    #[wasm_bindgen]
    pub fn load_state(&mut self, data: &[u8]) -> bool {
        if let Ok(snapshot) = postcard::from_bytes::<components::WorldSnapshot>(data) {
            // Clear existing world and tracked entities
            self.world.clear();
            self.entities.clear();

            self.current_tick = snapshot.tick;
            self.score = snapshot.score;
            self.player_health = snapshot.health;

            // Reconstruct entities from the snapshot
            for ent_snap in snapshot.entities {
                let mut builder = hecs::EntityBuilder::new();
                if let Some(p) = ent_snap.pos {
                    builder.add(p);
                }
                if let Some(v) = ent_snap.vel {
                    builder.add(v);
                }
                if let Some(r) = ent_snap.render {
                    builder.add(r);
                }
                if let Some(c) = ent_snap.collider {
                    builder.add(c);
                }
                if let Some(t) = ent_snap.tag {
                    builder.add(t);
                }
                if let Some(l) = ent_snap.lifetime {
                    builder.add(l);
                }
                if ent_snap.input_recv {
                    builder.add(components::InputReceiver);
                }

                let ent = self.world.spawn(builder.build());
                self.entities.push(ent);
            }

            true
        } else {
            false
        }
    }
}
