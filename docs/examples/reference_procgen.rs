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
        Collider {
            w: 32.0,
            h: 32.0,
            is_sensor: false,
            layer: 1, // LAYER_PLAYER
            mask: 2,
        },
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
                sprite_id: 3.0,
                rotation: 0.0,
            },
            Collider {
                w: 32.0,
                h: 32.0,
                is_sensor: false,
                layer: 2, // LAYER_SOLID
                mask: 1,
            },
            Tag::Wall,
        ));
        entities.push(top);

        let bottom = world.spawn((
            Position { x, y: height },
            Velocity { vx: 0.0, vy: 0.0 },
            Renderable {
                sprite_id: 3.0,
                rotation: 0.0,
            },
            Collider {
                w: 32.0,
                h: 32.0,
                is_sensor: false,
                layer: 2, // LAYER_SOLID
                mask: 1,
            },
            Tag::Wall,
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
                sprite_id: 3.0,
                rotation: 0.0,
            },
            Collider {
                w: 32.0,
                h: 32.0,
                is_sensor: false,
                layer: 2, // LAYER_SOLID
                mask: 1,
            },
            Tag::Wall,
        ));
        entities.push(left);

        let right = world.spawn((
            Position { x: width, y },
            Velocity { vx: 0.0, vy: 0.0 },
            Renderable {
                sprite_id: 3.0,
                rotation: 0.0,
            },
            Collider {
                w: 32.0,
                h: 32.0,
                is_sensor: false,
                layer: 2, // LAYER_SOLID
                mask: 1,
            },
            Tag::Wall,
        ));
        entities.push(right);

        y += 32.0;
    }

    // Spawn internal obstacles procedurally, but avoid the central player spawn area
    let mut spawned = 0;
    while spawned < 2000 {
        // Snap obstacles to a 32x32 grid to avoid pinch-points
        let grid_x = rng.next_range(3.0, (width / 32.0) - 3.0).floor();
        let grid_y = rng.next_range(3.0, (height / 32.0) - 3.0).floor();
        let ox = grid_x * 32.0;
        let oy = grid_y * 32.0;

        // Do not spawn within 100 pixels of the center player spawn
        let dx = ox - (width / 2.0);
        let dy = oy - (height / 2.0);
        if (dx * dx + dy * dy).sqrt() < 100.0 {
            continue; // Skip and try again
        }

        let ent = world.spawn((
            Position { x: ox, y: oy },
            Velocity { vx: 0.0, vy: 0.0 },
            Renderable {
                sprite_id: 2.0,
                rotation: 0.0,
            },
            Collider {
                w: 32.0,
                h: 32.0,
                is_sensor: false,
                layer: 2, // LAYER_SOLID
                mask: 1,
            },
            Tag::Obstacle,
        ));
        entities.push(ent);
        spawned += 1;
    }

    // Spawn Pickups (Sensors that can overlap geometry)
    for _ in 0..50 {
        let px = rng.next_range(100.0, width - 100.0);
        let py = rng.next_range(100.0, height - 100.0);
        let ent = world.spawn((
            Position { x: px, y: py },
            Velocity { vx: 0.0, vy: 0.0 },
            Renderable {
                sprite_id: 4.0,
                rotation: 0.0,
            },
            Collider {
                w: 16.0,
                h: 16.0,
                is_sensor: true,
                layer: 8, // LAYER_PICKUP
                mask: 0,
            },
            Tag::Pickup,
        ));
        entities.push(ent);
    }

    entities
}
