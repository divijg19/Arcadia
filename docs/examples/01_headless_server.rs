/*!
 * ARCADIA ENGINE REFERENCE: Headless Server Simulation
 *
 * Because Arcadia cleanly separates the Rust engine from the TypeScript renderer,
 * you can compile the exact same `arcadia-rs` crate into a native Linux/Windows
 * executable. This is perfect for authoritative multiplayer servers or rollback netcode.
 */

use arcadia_rs::ArcadiaCore;
use std::thread;
use std::time::{Duration, Instant};

pub fn run_headless_server() {
    // 1. Instantiate the Engine Core
    let mut core = ArcadiaCore::new();

    // 2. Spawn Game Entities manually (normally TypeScript does this via FFI)
    let player_id = core.spawn(
        1000.0, 1000.0, 0.0, 0.0, 32.0, 32.0, false, 1, 2, 0.0, 0, 0.0,
    );

    println!("Server started. Player spawned with ID: {}", player_id);

    // 3. Server Game Loop (60 Hz Fixed Timestep)
    let tick_rate = Duration::from_secs_f64(1.0 / 60.0);
    let mut last_time = Instant::now();

    loop {
        let now = Instant::now();
        let dt_ms = (now - last_time).as_secs_f64() * 1000.0;
        last_time = now;

        // Apply incoming network inputs (Simulated here)
        core.set_velocity(player_id as f32, 5.0, 0.0);

        // Step the simulation
        core.update(dt_ms);

        // Read physical contacts to broadcast to clients
        let contacts_len = core.get_contact_buffer_len();
        if contacts_len > 0 {
            println!(
                "Collision detected! Broadcasting {} floats to clients.",
                contacts_len
            );
        }

        // Sleep to maintain 60Hz loop without burning 100% CPU
        let elapsed = now.elapsed();
        if elapsed < tick_rate {
            thread::sleep(tick_rate - elapsed);
        }

        // In a real server, break on a shutdown signal
        if core.get_tick_count() > 600 {
            break;
        }
    }
}
