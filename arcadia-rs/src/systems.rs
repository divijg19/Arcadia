use hecs::World;
use std::collections::HashSet;

use crate::components;

pub type CellEntry = (hecs::Entity, f32, f32, f32, f32, components::Tag);

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
    // Axis-separated movement with swept-step collision prevention
    // 1. Collect all static solids (Walls and Obstacles) into a temporary vector
    let mut solids = Vec::new();

    // Build solids list with current positions (entity positions may change per frame)
    for (pos, col, tag) in world
        .query::<(
            &components::Position,
            &components::Collider,
            &components::Tag,
        )>()
        .iter()
    {
        if (*tag == components::Tag::Wall || *tag == components::Tag::Obstacle) && !col.is_sensor {
            solids.push((pos.x, pos.y, col.w, col.h));
        }
    }

    let overlaps =
        |px: f32, py: f32, pw: f32, ph: f32, sx: f32, sy: f32, sw: f32, sh: f32| -> bool {
            let dx = (px - sx).abs();
            let dy = (py - sy).abs();
            let epsilon = 0.01;
            dx < ((pw * 0.5) + (sw * 0.5) - epsilon) && dy < ((ph * 0.5) + (sh * 0.5) - epsilon)
        };

    let mut query = world.query::<(
        &mut components::Position,
        &mut components::Velocity,
        &components::Collider,
        &components::Tag,
    )>();

    for (pos, vel, col, tag) in query.iter() {
        if *tag != components::Tag::Player {
            pos.x += vel.vx;
            pos.y += vel.vy;
            pos.x = pos.x.clamp(0.0, 2000.0);
            pos.y = pos.y.clamp(0.0, 2000.0);
            continue;
        }

        // --- X AXIS SWEEP ---
        if vel.vx != 0.0 {
            let steps = vel.vx.abs().ceil() as i32;
            let step_x = vel.vx / steps as f32;

            for _ in 0..steps {
                let next_x = pos.x + step_x;
                let mut collided = false;
                for &(sx, sy, sw, sh) in &solids {
                    if overlaps(next_x, pos.y, col.w, col.h, sx, sy, sw, sh) {
                        collided = true;
                        vel.vx = 0.0;
                        if step_x > 0.0 {
                            pos.x = sx - (sw * 0.5) - (col.w * 0.5);
                        } else {
                            pos.x = sx + (sw * 0.5) + (col.w * 0.5);
                        }
                        break;
                    }
                }
                if collided {
                    break;
                }
                pos.x = next_x;
            }
        }

        // --- Y AXIS SWEEP ---
        if vel.vy != 0.0 {
            let steps = vel.vy.abs().ceil() as i32;
            let step_y = vel.vy / steps as f32;

            for _ in 0..steps {
                let next_y = pos.y + step_y;
                let mut collided = false;
                for &(sx, sy, sw, sh) in &solids {
                    if overlaps(pos.x, next_y, col.w, col.h, sx, sy, sw, sh) {
                        collided = true;
                        vel.vy = 0.0;
                        if step_y > 0.0 {
                            pos.y = sy - (sh * 0.5) - (col.h * 0.5);
                        } else {
                            pos.y = sy + (sh * 0.5) + (col.h * 0.5);
                        }
                        break;
                    }
                }
                if collided {
                    break;
                }
                pos.y = next_y;
            }
        }

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

pub fn collision_system(world: &mut World, events: &mut Vec<f32>, score: &mut f32) {
    const CELL_SIZE: f32 = 100.0;
    const GRID_COLS: usize = 20; // 2000.0 / 100.0
    const GRID_ROWS: usize = 20;
    const GRID_SIZE: usize = GRID_COLS * GRID_ROWS;

    let mut grid: Vec<Vec<CellEntry>> = vec![Vec::new(); GRID_SIZE];

    // 1. Populate the grid
    for (entity, pos, col, tag) in world
        .query::<(
            hecs::Entity,
            &components::Position,
            &components::Collider,
            &components::Tag,
        )>()
        .iter()
    {
        let min_x = (((pos.x - col.w / 2.0) / CELL_SIZE).max(0.0) as usize).min(GRID_COLS - 1);
        let max_x = (((pos.x + col.w / 2.0) / CELL_SIZE).max(0.0) as usize).min(GRID_COLS - 1);
        let min_y = (((pos.y - col.h / 2.0) / CELL_SIZE).max(0.0) as usize).min(GRID_ROWS - 1);
        let max_y = (((pos.y + col.h / 2.0) / CELL_SIZE).max(0.0) as usize).min(GRID_ROWS - 1);

        for x in min_x..=max_x {
            for y in min_y..=max_y {
                let idx = y * GRID_COLS + x;
                grid[idx].push((entity, pos.x, pos.y, col.w, col.h, *tag));
            }
        }
    }

    let mut to_despawn: Vec<hecs::Entity> = Vec::new();
    let mut processed_pairs = HashSet::new(); // Tracks entity pairs to avoid double-evaluating overlaps

    // 2. Evaluate collisions
    for cell in grid {
        let len = cell.len();
        if len < 2 {
            continue;
        }

        for i in 0..len {
            for j in (i + 1)..len {
                let (e1, x1, y1, w1, h1, t1) = cell[i];
                let (e2, x2, y2, w2, h2, t2) = cell[j];

                // Ensure consistent pair ordering for the HashSet
                let pair = if e1.id() < e2.id() {
                    (e1.id(), e2.id())
                } else {
                    (e2.id(), e1.id())
                };
                if !processed_pairs.insert(pair) {
                    continue; // We already checked this pair in another cell!
                }

                let dx = x1 - x2;
                let dy = y1 - y2;
                let overlap_x = ((w1 * 0.5) + (w2 * 0.5)) - dx.abs();
                let overlap_y = ((h1 * 0.5) + (h2 * 0.5)) - dy.abs();

                // If bounding boxes overlap
                if overlap_x > 0.0 && overlap_y > 0.0 {
                    // RULE A: Bullet Destruction
                    let is_bullet_obstacle = (t1 == components::Tag::Bullet
                        && t2 == components::Tag::Obstacle)
                        || (t2 == components::Tag::Bullet && t1 == components::Tag::Obstacle);
                    let is_bullet_wall = (t1 == components::Tag::Bullet
                        && t2 == components::Tag::Wall)
                        || (t2 == components::Tag::Bullet && t1 == components::Tag::Wall);

                    if is_bullet_obstacle {
                        to_despawn.push(e1);
                        to_despawn.push(e2);
                        events.push(1.0);
                        events.push(x1);
                        events.push(y1); // Boom
                    } else if is_bullet_wall {
                        if t1 == components::Tag::Bullet {
                            to_despawn.push(e1);
                        }
                        if t2 == components::Tag::Bullet {
                            to_despawn.push(e2);
                        }
                        events.push(2.0);
                        events.push(x1);
                        events.push(y1); // Clink
                    }
                    // RULE C: Pickups (Player vs Pickup)
                    let is_player_pickup = (t1 == components::Tag::Player
                        && t2 == components::Tag::Pickup)
                        || (t2 == components::Tag::Player && t1 == components::Tag::Pickup);

                    if is_player_pickup {
                        if t1 == components::Tag::Pickup {
                            to_despawn.push(e1);
                        }
                        if t2 == components::Tag::Pickup {
                            to_despawn.push(e2);
                        }
                        // Increase score and emit a coin collected event (3.0)
                        *score += 50.0;
                        events.push(3.0);
                        events.push(x1);
                        events.push(y1);
                    }
                }
            }
        }
    }

    // 3. Apply Despawns
    for e in to_despawn {
        let _ = world.despawn(e).ok();
    }

    // 4. No kinematic resolutions here; movement_system handles player/solid behavior
}
