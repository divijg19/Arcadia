use hecs::World;

use crate::components::{Collider, InputReceiver, Position, Renderable, Tag, Velocity};
use crate::rng::Rng;

pub fn generate_arena(world: &mut World, seed: u64, width: f32, height: f32) -> Vec<hecs::Entity> {
    // Clear the world to start fresh
    world.clear();

    let mut entities: Vec<hecs::Entity> = Vec::new();
    let mut rng = Rng::new(seed);

    // Spawn player at center
    let px = width / 2.0;
    let py = height / 2.0;
    let player = world.spawn((
        Position { x: px, y: py },
        Velocity { vx: 0.0, vy: 0.0 },
        Renderable {
            sprite_id: 0.0,
            rotation: 0.0,
        },
        InputReceiver,
        Collider { w: 32.0, h: 32.0 },
        Tag::Player,
    ));
    entities.push(player);

    // Spawn border walls (top and bottom rows)
    let mut x = 0.0;
    while x <= width {
        let top = world.spawn((
            Position { x, y: 0.0 },
            Velocity { vx: 0.0, vy: 0.0 },
            Renderable {
                sprite_id: 0.0,
                rotation: 0.0,
            },
            Collider { w: 32.0, h: 32.0 },
            Tag::Obstacle,
        ));
        entities.push(top);

        let bottom = world.spawn((
            Position { x, y: height },
            Velocity { vx: 0.0, vy: 0.0 },
            Renderable {
                sprite_id: 0.0,
                rotation: 0.0,
            },
            Collider { w: 32.0, h: 32.0 },
            Tag::Obstacle,
        ));
        entities.push(bottom);

        x += 32.0;
    }

    // Spawn left and right columns (avoid duplicating corners)
    let mut y = 32.0; // start after corner
    while y < height {
        let left = world.spawn((
            Position { x: 0.0, y },
            Velocity { vx: 0.0, vy: 0.0 },
            Renderable {
                sprite_id: 0.0,
                rotation: 0.0,
            },
            Collider { w: 32.0, h: 32.0 },
            Tag::Obstacle,
        ));
        entities.push(left);

        let right = world.spawn((
            Position { x: width, y },
            Velocity { vx: 0.0, vy: 0.0 },
            Renderable {
                sprite_id: 0.0,
                rotation: 0.0,
            },
            Collider { w: 32.0, h: 32.0 },
            Tag::Obstacle,
        ));
        entities.push(right);

        y += 32.0;
    }

    // Spawn internal obstacles procedurally
    for _ in 0..200 {
        let ox = rng.next_range(100.0, width - 100.0);
        let oy = rng.next_range(100.0, height - 100.0);
        let ent = world.spawn((
            Position { x: ox, y: oy },
            Velocity { vx: 0.0, vy: 0.0 },
            Renderable {
                sprite_id: 0.0,
                rotation: 0.0,
            },
            Collider { w: 32.0, h: 32.0 },
            Tag::Obstacle,
        ));
        entities.push(ent);
    }

    entities
}
