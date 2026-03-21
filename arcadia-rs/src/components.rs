use serde::{Deserialize, Serialize};

// Simple ECS component definitions for Arcadia

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct Position {
    pub x: f32,
    pub y: f32,
}

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct Velocity {
    pub vx: f32,
    pub vy: f32,
}

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct Renderable {
    pub sprite_id: f32,
    pub rotation: f32,
}

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct Lifetime {
    pub remaining_ms: f64,
}

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct Gravity {
    pub acceleration: f32,
    pub max_fall_speed: f32,
    pub is_grounded: bool,
}

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct Collider {
    pub w: f32,
    pub h: f32,
    pub is_sensor: bool,
    pub layer: u8,
    pub mask: u8,
}

#[derive(Serialize, Deserialize, PartialEq, Eq, Clone, Copy)]
pub enum Tag {
    Player,
    Obstacle,
    Bullet,
    Wall,
    Pickup,
}

#[derive(Serialize, Deserialize)]
pub struct EntitySnapshot {
    pub pos: Option<Position>,
    pub vel: Option<Velocity>,
    pub render: Option<Renderable>,
    pub collider: Option<Collider>,
    pub tag: Option<Tag>,
    pub input_recv: bool,
    pub lifetime: Option<Lifetime>,
    pub gravity: Option<Gravity>,
}

#[derive(Serialize, Deserialize)]
pub struct WorldSnapshot {
    pub tick: u32,
    pub score: f32,
    pub health: f32,
    pub entities: Vec<EntitySnapshot>,
}
