use hecs::World;

use crate::components;

// Input bitmask constants
const UP: u8 = 1;
const DOWN: u8 = 2;
const LEFT: u8 = 4;
const RIGHT: u8 = 8;

pub fn apply_input_system(world: &mut World, input_mask: u8) {
    // Iterate over entities that have a Velocity and are marked as InputReceiver
    let mut query = world.query::<(&mut components::Velocity, &components::InputReceiver)>();
    for (vel, _recv) in query.iter() {
        // reset velocity
        vel.vx = 0.0;
        vel.vy = 0.0;

        if (input_mask & UP) != 0 {
            vel.vy = -5.0;
        }
        if (input_mask & DOWN) != 0 {
            vel.vy = 5.0;
        }
        if (input_mask & LEFT) != 0 {
            vel.vx = -5.0;
        }
        if (input_mask & RIGHT) != 0 {
            vel.vx = 5.0;
        }
    }
}

pub fn movement_system(world: &mut World) {
    // Move entities according to their velocity
    let mut query = world.query::<(&mut components::Position, &components::Velocity)>();
    for (pos, vel) in query.iter() {
        pos.x += vel.vx;
        pos.y += vel.vy;
    }
}

pub fn lifetime_system(world: &mut World, dt_ms: f64) {
    let mut dead: Vec<hecs::Entity> = Vec::new();

    // Iterate over entities that have a Lifetime component and decrement
    for (entity, lifetime) in world
        .query_mut::<(hecs::Entity, &mut components::Lifetime)>()
        .into_iter()
    {
        lifetime.remaining_ms -= dt_ms;
        if lifetime.remaining_ms <= 0.0 {
            dead.push(entity);
        }
    }

    // Despawn dead entities after the iteration
    for e in dead {
        let _ = world.despawn(e);
    }
}
