#[cfg(test)]
mod tests {
    use crate::ArcadiaCore;
    use crate::components::{Position, Tag};
    use crate::rng::Rng;

    #[test]
    fn test_rng_determinism() {
        let mut rng1 = Rng::new(1337);
        let mut rng2 = Rng::new(1337);
        // Both RNGs seeded identically must produce the exact same sequence
        assert_eq!(rng1.next_u64(), rng2.next_u64());
        assert_eq!(rng1.next_f32(), rng2.next_f32());
    }

    #[test]
    fn test_procgen_entity_counts() {
        let mut core = ArcadiaCore::new();
        core.init_world(42);

        // Count internal obstacles
        let mut obstacle_count = 0;
        for tag in core.world.query::<&Tag>().iter() {
            if *tag == Tag::Obstacle {
                obstacle_count += 1;
            }
        }
        // Exactly 2000 obstacles should be spawned by procgen
        assert_eq!(obstacle_count, 2000);
    }

    #[test]
    fn test_bullet_vs_obstacle_destruction() {
        let mut core = ArcadiaCore::new();
        // Spawn Player to act as the camera anchor (avoids panic)
        core.spawn_entity(100.0, 100.0);

        // Spawn a bullet at (200, 200) moving right
        core.spawn_bullet(200.0, 200.0, 10.0, 0.0);

        // Manually spawn an obstacle directly in front of it at (215, 200)
        core.world.spawn((
            Position { x: 215.0, y: 200.0 },
            crate::components::Collider { w: 32.0, h: 32.0 },
            Tag::Obstacle,
        ));

        // Tick the simulation forward
        core.update(1000.0 / 60.0);

        // Check Event Buffer (Should contain Event 1.0 = BOOM)
        assert!(
            core.event_buffer.contains(&1.0),
            "Expected destruction event"
        );

        // Ensure both bullet and obstacle are despawned
        let remaining_entities = core.world.len();
        assert_eq!(remaining_entities, 1, "Only the player should remain");
    }

    #[test]
    fn test_kinematic_wall_pushout() {
        let mut core = ArcadiaCore::new();

        // Spawn Player at (100, 100)
        let player = core.world.spawn((
            Position { x: 100.0, y: 100.0 },
            crate::components::Collider { w: 32.0, h: 32.0 },
            Tag::Player,
        ));

        // Spawn Wall at (120, 100)
        // Player Width=32, Wall Width=32. Center distance is 20.
        // Overlap = (16 + 16) - 20 = 12 pixels of overlap.
        core.world.spawn((
            Position { x: 120.0, y: 100.0 },
            crate::components::Collider { w: 32.0, h: 32.0 },
            Tag::Wall,
        ));

        // Tick the collision system
        core.update(1000.0 / 60.0);

        // Player should be pushed Left by 12 pixels (100.0 - 12.0 = 88.0)
        let player_pos = core.world.query_one_mut::<&Position>(player).unwrap();
        assert_eq!(
            player_pos.x, 88.0,
            "Player should be pushed out of the wall"
        );
    }
}
