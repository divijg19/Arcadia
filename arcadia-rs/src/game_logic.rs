use hecs::World;
use std::collections::HashSet;

use crate::components;

pub fn process_contacts(
    world: &mut World,
    contacts: Vec<(hecs::Entity, hecs::Entity)>,
    events: &mut Vec<f32>,
    score: &mut f32,
) {
    let mut to_despawn: Vec<hecs::Entity> = Vec::new();
    let mut despawned: HashSet<u32> = HashSet::new();

    for (a, b) in contacts {
        let tag_a = match world.get::<&components::Tag>(a) {
            Ok(t) => *t,
            Err(_) => continue,
        };
        let tag_b = match world.get::<&components::Tag>(b) {
            Ok(t) => *t,
            Err(_) => continue,
        };

        // Choose a position for the event: prefer `a`, fallback to `b`
        let (ex, ey) = match (
            world.get::<&components::Position>(a),
            world.get::<&components::Position>(b),
        ) {
            (Ok(p), _) => (p.x, p.y),
            (_, Ok(p)) => (p.x, p.y),
            _ => continue,
        };

        // Bullet vs Obstacle -> despawn both, BOOM event, +10 score
        let is_bullet_obstacle = (tag_a == components::Tag::Bullet
            && tag_b == components::Tag::Obstacle)
            || (tag_b == components::Tag::Bullet && tag_a == components::Tag::Obstacle);
        if is_bullet_obstacle {
            if despawned.insert(a.id()) {
                to_despawn.push(a);
            }
            if despawned.insert(b.id()) {
                to_despawn.push(b);
            }
            events.push(1.0);
            events.push(ex);
            events.push(ey);
            *score += 10.0;
            continue;
        }

        // Bullet vs Wall -> despawn bullet only, CLINK event
        let is_bullet_wall = (tag_a == components::Tag::Bullet && tag_b == components::Tag::Wall)
            || (tag_b == components::Tag::Bullet && tag_a == components::Tag::Wall);
        if is_bullet_wall {
            if tag_a == components::Tag::Bullet && despawned.insert(a.id()) {
                to_despawn.push(a);
            }
            if tag_b == components::Tag::Bullet && despawned.insert(b.id()) {
                to_despawn.push(b);
            }
            events.push(2.0);
            events.push(ex);
            events.push(ey);
            continue;
        }

        // Player vs Pickup -> despawn pickup, PICKUP event, +50 score
        let is_player_pickup = (tag_a == components::Tag::Player
            && tag_b == components::Tag::Pickup)
            || (tag_b == components::Tag::Player && tag_a == components::Tag::Pickup);
        if is_player_pickup {
            if tag_a == components::Tag::Pickup && despawned.insert(a.id()) {
                to_despawn.push(a);
            }
            if tag_b == components::Tag::Pickup && despawned.insert(b.id()) {
                to_despawn.push(b);
            }
            *score += 50.0;
            events.push(3.0);
            events.push(ex);
            events.push(ey);
            continue;
        }
    }

    // Apply despawns
    for e in to_despawn {
        let _ = world.despawn(e).ok();
    }
}
