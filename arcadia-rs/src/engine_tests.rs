#[cfg(test)]
mod tests {
    use crate::ArcadiaCore;
    use crate::components::{Position, Tag};
    use crate::rng::Rng;
    use hecs;

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

        // Spawn Player at (100, 100) moving right at 20.0 px/frame
        let player = core.world.spawn((
            Position { x: 100.0, y: 100.0 },
            crate::components::Velocity { vx: 20.0, vy: 0.0 },
            crate::components::Collider { w: 32.0, h: 32.0 },
            Tag::Player,
        ));

        // Spawn Wall at (132, 100)
        // Player Width=32, Wall Width=32. Left edge snap target: 132 - 16 - 16 = 100
        core.world.spawn((
            Position { x: 132.0, y: 100.0 },
            crate::components::Collider { w: 32.0, h: 32.0 },
            Tag::Wall,
        ));

        // Run axis-separated movement system directly
        crate::systems::movement_system(&mut core.world);

        // Player should be snapped back to exactly 100.0
        let player_pos = core.world.query_one_mut::<&Position>(player).unwrap();
        assert_eq!(
            player_pos.x, 100.0,
            "Player should be snapped flush against the wall"
        );
    }

    #[test]
    fn test_procgen_clear_spawn_zone() {
        let mut core = ArcadiaCore::new();
        core.init_world(42);

        let center_x = 1000.0;
        let center_y = 1000.0;

        for (pos, tag) in core.world.query::<(&Position, &Tag)>().iter() {
            if *tag == Tag::Obstacle {
                let dx = pos.x - center_x;
                let dy = pos.y - center_y;
                let dist = (dx * dx + dy * dy).sqrt();
                assert!(
                    dist >= 100.0,
                    "Obstacle spawned inside the player clear zone!"
                );
            }
        }
    }

    #[test]
    fn test_perfect_wall_slide() {
        let mut world = hecs::World::new();

        // Player is moving Right AND Down (Diagonal into a wall)
        let player = world.spawn((
            Position { x: 100.0, y: 100.0 },
            crate::components::Velocity { vx: 20.0, vy: 20.0 },
            crate::components::Collider { w: 32.0, h: 32.0 },
            Tag::Player,
        ));

        // Wall is to the Right (X = 132.0).
        // Player should slide DOWN the wall, but be stopped on the X axis.
        world.spawn((
            Position { x: 132.0, y: 100.0 },
            crate::components::Velocity { vx: 0.0, vy: 0.0 },
            crate::components::Collider { w: 32.0, h: 32.0 },
            Tag::Wall,
        ));

        crate::systems::movement_system(&mut world);

        let pos = world.query_one_mut::<&Position>(player).unwrap();
        // X snapped to exactly 100.0 (Left edge of wall: 132 - 16 - 16)
        assert_eq!(pos.x, 100.0);
        // Y moved freely by 20.0
        assert_eq!(pos.y, 120.0);
    }

    #[test]
    fn test_flush_edge_sliding_no_lag() {
        let mut world = hecs::World::new();

        // Player is perfectly flush against a wall on the X axis, moving DOWN
        let player = world.spawn((
            Position { x: 100.0, y: 100.0 },
            crate::components::Velocity { vx: 0.0, vy: 20.0 }, // Moving only Y
            crate::components::Collider { w: 32.0, h: 32.0 },
            Tag::Player,
        ));

        // Wall is perfectly flush (Distance 32, so edges touch exactly)
        world.spawn((
            Position { x: 132.0, y: 100.0 },
            crate::components::Velocity { vx: 0.0, vy: 0.0 },
            crate::components::Collider { w: 32.0, h: 32.0 },
            Tag::Wall,
        ));

        crate::systems::movement_system(&mut world);

        let pos = world.query_one_mut::<&Position>(player).unwrap();
        // Player should move down freely to 120.0 without getting caught by the flush X wall
        assert_eq!(pos.y, 120.0);
    }

    #[test]
    fn test_high_speed_tunneling_prevention() {
        let mut world = hecs::World::new();

        // Player moving incredibly fast to the right
        let player = world.spawn((
            Position { x: 100.0, y: 100.0 },
            crate::components::Velocity { vx: 200.0, vy: 0.0 },
            crate::components::Collider { w: 32.0, h: 32.0 },
            Tag::Player,
        ));

        // A thin wall directly in the path
        world.spawn((
            Position { x: 140.0, y: 100.0 },
            crate::components::Velocity { vx: 0.0, vy: 0.0 },
            crate::components::Collider { w: 32.0, h: 32.0 },
            Tag::Wall,
        ));

        crate::systems::movement_system(&mut world);

        let pos = world.query_one_mut::<&Position>(player).unwrap();
        // The player must NOT be at 300.0. They should have stopped exactly flush with the wall.
        // Wall left edge = 140 - 16 = 124. Player right edge = x + 16. Flush X = 108.
        let expected_x = 108.0;
        assert!(
            (pos.x - expected_x).abs() < 1.0,
            "Player tunneled through the wall! Pos: {}",
            pos.x
        );
    }
}
