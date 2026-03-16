// Simple ECS component definitions for Arcadia

pub struct Position {
    pub x: f32,
    pub y: f32,
}

pub struct Velocity {
    pub vx: f32,
    pub vy: f32,
}

// Tag component to mark the player-controlled entity
pub struct InputReceiver;

pub struct Renderable {
    pub sprite_id: f32,
    pub rotation: f32,
}

pub struct Lifetime {
    pub remaining_ms: f64,
}
