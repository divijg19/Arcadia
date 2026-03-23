# ARCADIA ENGINE REFERENCE: Advanced Bitmask Physics

Arcadia uses standard 2D physics layers. The engine evaluates solid collisions in `systems.rs` using a bitwise AND operator.

```rust
if (moving_entity.mask & solid_entity.layer) != 0 {
    // Collision Occurs!
}
```

The Standard Layout

    Layer 1: Players / Moving Entities

    Layer 2: Environment (Walls, Solid Floor)

    Layer 4: Projectiles (Bullets)

    Layer 8: Sensors (Pickups, Water, Lava)

Examples

1. A Standard Wall

```rust
Collider { layer: 2, mask: 1 }
```

Exists on Layer 2. Blocks anything on Layer 1 (Player).

2. A "Ghost" Player

```rust
Collider { layer: 1, mask: 0 }
```

Exists on Layer 1. Mask is 0, meaning (0 & 2) == 0. The ghost will pass straight through standard walls.

3. A Specific Magic Door

```rust
Collider { layer: 16, mask: 0 } // The Door
Collider { layer: 1, mask: 2 | 16 } // The Player
```

The door exists on a custom Layer (16). The player's mask is 18 (Binary: 10010). The player will collide with standard walls (2) AND the magic door (16).

4. A Sensor (Coin)

```rust
Collider { layer: 8, mask: 0, is_sensor: true }
```

The coin will never push out of walls. Because is_sensor is true, the movement_system explicitly ignores it when collecting solid geometry.
