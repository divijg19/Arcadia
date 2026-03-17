use hecs::World;

use crate::components;

type CellEntry = (hecs::Entity, f32, f32, f32, f32, components::Tag);

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

pub fn collision_system(world: &mut World, events: &mut Vec<f32>) {
    const CELL_SIZE: f32 = 100.0;
    const GRID_COLS: usize = 20; // 2000.0 / 100.0
    const GRID_ROWS: usize = 20;
    const GRID_SIZE: usize = GRID_COLS * GRID_ROWS;

    // 1. Initialize a flat grid of 400 cells
    let mut grid: Vec<Vec<CellEntry>> = vec![Vec::new(); GRID_SIZE];

    // 2. Populate the grid
    for (entity, pos, col, tag) in world
        .query::<(
            hecs::Entity,
            &components::Position,
            &components::Collider,
            &components::Tag,
        )>()
        .iter()
    {
        // Calculate the grid bounds this AABB touches
        let min_x_f = (pos.x - col.w * 0.5) / CELL_SIZE;
        let max_x_f = (pos.x + col.w * 0.5) / CELL_SIZE;
        let min_y_f = (pos.y - col.h * 0.5) / CELL_SIZE;
        let max_y_f = (pos.y + col.h * 0.5) / CELL_SIZE;

        let min_x = if min_x_f < 0.0 {
            0
        } else {
            std::cmp::min(min_x_f as usize, GRID_COLS - 1)
        };
        let max_x = if max_x_f < 0.0 {
            0
        } else {
            std::cmp::min(max_x_f as usize, GRID_COLS - 1)
        };
        let min_y = if min_y_f < 0.0 {
            0
        } else {
            std::cmp::min(min_y_f as usize, GRID_ROWS - 1)
        };
        let max_y = if max_y_f < 0.0 {
            0
        } else {
            std::cmp::min(max_y_f as usize, GRID_ROWS - 1)
        };

        // Insert into every overlapping cell
        for x in min_x..=max_x {
            for y in min_y..=max_y {
                let idx = y * GRID_COLS + x;
                grid[idx].push((entity, pos.x, pos.y, col.w, col.h, *tag));
            }
        }
    }

    let mut to_despawn: Vec<hecs::Entity> = Vec::new();

    // 3. Evaluate collisions only within individual cells
    for cell in grid {
        let len = cell.len();
        if len < 2 {
            continue;
        } // No collisions possible in an empty or single-entity cell

        for i in 0..len {
            for j in (i + 1)..len {
                let (e1, x1, y1, w1, h1, t1) = cell[i];
                let (e2, x2, y2, w2, h2, t2) = cell[j];

                // Collision rules
                let is_bullet_obstacle = (t1 == components::Tag::Bullet
                    && t2 == components::Tag::Obstacle)
                    || (t2 == components::Tag::Bullet && t1 == components::Tag::Obstacle);
                let is_bullet_wall = (t1 == components::Tag::Bullet && t2 == components::Tag::Wall)
                    || (t2 == components::Tag::Bullet && t1 == components::Tag::Wall);

                if !is_bullet_obstacle && !is_bullet_wall {
                    continue;
                }

                let dx = (x1 - x2).abs();
                let dy = (y1 - y2).abs();
                let overlap_x = dx < ((w1 * 0.5) + (w2 * 0.5));
                let overlap_y = dy < ((h1 * 0.5) + (h2 * 0.5));

                if overlap_x && overlap_y {
                    if is_bullet_obstacle {
                        // Emit an explosion event (EventType 1.0) at the collision point
                        events.push(1.0);
                        events.push(x1);
                        events.push(y1);
                        to_despawn.push(e1);
                        to_despawn.push(e2);
                    } else if is_bullet_wall {
                        // Emit a spark event (EventType 2.0)
                        events.push(2.0);
                        events.push(x1);
                        events.push(y1);
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
    }

    // 4. Despawn (Entities might be added to this list multiple times if they overlap multiple cells,
    // but `world.despawn().ok()` safely ignores already-despawned entities).
    for e in to_despawn {
        let _ = world.despawn(e).ok();
    }
}
