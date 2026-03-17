pub struct Rng {
    state: u64,
}

impl Rng {
    pub fn new(seed: u64) -> Self {
        // Xorshift cannot start with a seed of 0
        Self { state: seed.max(1) }
    }

    pub fn next(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        x
    }

    pub fn next_f32(&mut self) -> f32 {
        // Take the upper 24 bits to construct a float between 0.0 and 1.0
        (self.next() & 0xFFFFFF) as f32 / 16777216.0
    }

    pub fn next_range(&mut self, min: f32, max: f32) -> f32 {
        min + self.next_f32() * (max - min)
    }
}
