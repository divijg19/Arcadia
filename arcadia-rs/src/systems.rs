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

        // World bounds clamp: keep entities inside 0..2000 range
        pos.x = pos.x.clamp(0.0, 2000.0);
        pos.y = pos.y.clamp(0.0, 2000.0);
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

pub fn collision_system(world: &mut World) {
    // Collect collidable entities into a temporary list to avoid borrowing issues
    let mut collidables: Vec<(hecs::Entity, f32, f32, f32, f32, components::Tag)> = Vec::new();

    for (entity, pos, col, tag) in world
        .query::<(
            hecs::Entity,
            &components::Position,
            &components::Collider,
            &components::Tag,
        )>()
        .iter()
    {
        collidables.push((entity, pos.x, pos.y, col.w, col.h, *tag));
    }

    let mut to_despawn: Vec<hecs::Entity> = Vec::new();

    for i in 0..collidables.len() {
        for j in (i + 1)..collidables.len() {
            let (e1, x1, y1, w1, h1, t1) = collidables[i];
            let (e2, x2, y2, w2, h2, t2) = collidables[j];

            // Check collision overlaps
            let dx = (x1 - x2).abs();
            let dy = (y1 - y2).abs();
            let overlap_x = dx < ((w1 * 0.5) + (w2 * 0.5));
            let overlap_y = dy < ((h1 * 0.5) + (h2 * 0.5));

            // Collision rules:
            // - Bullet vs Obstacle: despawn both
            // - Bullet vs Wall: despawn only the bullet
            let is_bullet_obstacle = (t1 == components::Tag::Bullet
                && t2 == components::Tag::Obstacle)
                || (t2 == components::Tag::Bullet && t1 == components::Tag::Obstacle);
            let is_bullet_wall = (t1 == components::Tag::Bullet && t2 == components::Tag::Wall)
                || (t2 == components::Tag::Bullet && t1 == components::Tag::Wall);

            if overlap_x && overlap_y {
                if is_bullet_obstacle {
                    to_despawn.push(e1);
                    to_despawn.push(e2);
                } else if is_bullet_wall {
                    if t1 == components::Tag::Bullet {
                        to_despawn.push(e1);
                    }
                    if t2 == components::Tag::Bullet {
                        to_despawn.push(e2);
                    }
                }
            }
        }
    }

    for e in to_despawn {
        let _ = world.despawn(e);
    }
}
