use hecs::World;

use crate::components;

type Cell = (hecs::Entity, f32, f32, f32, f32);
type Grid = Vec<Vec<Cell>>;

// Apply player input mask to any entity with a Velocity + InputReceiver
pub fn apply_input_system(world: &mut World, input_mask: u8) {
    // bitmask mapping matches InputManager in the TS frontend
    // UP=1, DOWN=2, LEFT=4, RIGHT=8
    let speed: f32 = 6.0;

    for (vel, input_rcv) in world.query_mut::<(
        &mut components::Velocity,
        Option<&components::InputReceiver>,
    )>() {
        if input_rcv.is_none() {
            continue;
        }

        let mut vx = 0.0f32;
        let mut vy = 0.0f32;
        if (input_mask & 1) != 0 {
            vy -= speed;
        }
        if (input_mask & 2) != 0 {
            vy += speed;
        }
        if (input_mask & 4) != 0 {
            vx -= speed;
        }
        if (input_mask & 8) != 0 {
            vx += speed;
        }

        vel.vx = vx;
        vel.vy = vy;
    }
}

// Axis-separated swept movement with sensor handling.
pub fn movement_system(world: &mut World) {
    // Build a static list of solids (non-sensor colliders) to test against.
    let mut solids: Vec<(hecs::Entity, f32, f32, f32, f32)> = Vec::new();
    for (ent, pos, col) in world
        .query::<(hecs::Entity, &components::Position, &components::Collider)>()
        .iter()
    {
        if !col.is_sensor {
            solids.push((ent, pos.x, pos.y, col.w, col.h));
        }
    }

    // Iterate mutable over movers (entities with Position + Velocity + Collider)
    for (entity, pos, vel, col) in world.query_mut::<(
        hecs::Entity,
        &mut components::Position,
        &components::Velocity,
        &components::Collider,
    )>() {
        // X axis
        let start_x = pos.x;
        let mut best_new_x = start_x + vel.vx;

        if vel.vx != 0.0 {
            for (s_ent, sx, sy, sw, sh) in solids.iter() {
                if *s_ent == entity {
                    continue;
                }
                // Only consider solids that vertically overlap the mover
                let vertical_overlap = (pos.y - sy).abs() < ((col.h * 0.5) + (sh * 0.5));
                if !vertical_overlap {
                    continue;
                }

                let sum_half = (col.w * 0.5) + (sw * 0.5);
                // Moving right
                if vel.vx > 0.0 && start_x < *sx {
                    let candidate = sx - sum_half;
                    if candidate >= start_x && candidate <= best_new_x {
                        best_new_x = candidate;
                    }
                }
                // Moving left
                if vel.vx < 0.0 && start_x > *sx {
                    let candidate = sx + sum_half;
                    if candidate <= start_x && candidate >= best_new_x {
                        best_new_x = candidate;
                    }
                }
            }
        }

        pos.x = best_new_x.clamp(0.0, 2000.0);

        // Y axis (use updated X for horizontal overlap checks)
        let start_y = pos.y;
        let mut best_new_y = start_y + vel.vy;

        if vel.vy != 0.0 {
            for (s_ent, sx, sy, sw, sh) in solids.iter() {
                if *s_ent == entity {
                    continue;
                }
                // Only consider solids that horizontally overlap the mover
                let horizontal_overlap = (pos.x - sx).abs() < ((col.w * 0.5) + (sw * 0.5));
                if !horizontal_overlap {
                    continue;
                }

                let sum_half = (col.h * 0.5) + (sh * 0.5);
                // Moving down
                if vel.vy > 0.0 && start_y < *sy {
                    let candidate = sy - sum_half;
                    if candidate >= start_y && candidate <= best_new_y {
                        best_new_y = candidate;
                    }
                }
                // Moving up
                if vel.vy < 0.0 && start_y > *sy {
                    let candidate = sy + sum_half;
                    if candidate <= start_y && candidate >= best_new_y {
                        best_new_y = candidate;
                    }
                }
            }
        }

        pos.y = best_new_y.clamp(0.0, 2000.0);
    }
}

pub fn lifetime_system(world: &mut World, dt_ms: f64) {
    let mut dead: Vec<hecs::Entity> = Vec::new();

    for (entity, lifetime) in world.query_mut::<(hecs::Entity, &mut components::Lifetime)>() {
        lifetime.remaining_ms -= dt_ms;
        if lifetime.remaining_ms <= 0.0 {
            dead.push(entity);
        }
    }

    for e in dead {
        let _ = world.despawn(e);
    }
}

// Collision detection returns contact pairs (including sensors). Game logic is applied elsewhere.
pub fn collision_system(world: &mut World) -> Vec<(hecs::Entity, hecs::Entity)> {
    const CELL_SIZE: f32 = 100.0;
    const GRID_COLS: usize = 20;
    const GRID_ROWS: usize = 20;
    const GRID_SIZE: usize = GRID_COLS * GRID_ROWS;

    let mut grid: Grid = vec![Vec::new(); GRID_SIZE];

    // Populate grid with all colliders (including sensors)
    for (entity, pos, col) in world
        .query::<(hecs::Entity, &components::Position, &components::Collider)>()
        .iter()
    {
        let min_x = (((pos.x - col.w / 2.0) / CELL_SIZE).max(0.0) as usize).min(GRID_COLS - 1);
        let max_x = (((pos.x + col.w / 2.0) / CELL_SIZE).max(0.0) as usize).min(GRID_COLS - 1);
        let min_y = (((pos.y - col.h / 2.0) / CELL_SIZE).max(0.0) as usize).min(GRID_ROWS - 1);
        let max_y = (((pos.y + col.h / 2.0) / CELL_SIZE).max(0.0) as usize).min(GRID_ROWS - 1);

        for x in min_x..=max_x {
            for y in min_y..=max_y {
                let idx = y * GRID_COLS + x;
                grid[idx].push((entity, pos.x, pos.y, col.w, col.h));
            }
        }
    }

    let mut contacts = Vec::new();
    let mut processed_pairs: std::collections::HashSet<(u32, u32)> =
        std::collections::HashSet::new();

    for cell in grid {
        let len = cell.len();
        if len < 2 {
            continue;
        }

        for i in 0..len {
            for j in (i + 1)..len {
                let (e1, x1, y1, w1, h1) = cell[i];
                let (e2, x2, y2, w2, h2) = cell[j];

                let pair = if e1.id() < e2.id() {
                    (e1.id(), e2.id())
                } else {
                    (e2.id(), e1.id())
                };
                if !processed_pairs.insert(pair) {
                    continue;
                }

                let dx = (x1 - x2).abs();
                let dy = (y1 - y2).abs();
                let epsilon = 0.01;
                let overlap_x = dx < ((w1 * 0.5) + (w2 * 0.5) - epsilon);
                let overlap_y = dy < ((h1 * 0.5) + (h2 * 0.5) - epsilon);

                if overlap_x && overlap_y {
                    contacts.push(if e1.id() < e2.id() {
                        (e1, e2)
                    } else {
                        (e2, e1)
                    });
                }
            }
        }
    }

    contacts
}
