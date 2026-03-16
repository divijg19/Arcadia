use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn get_engine_version() -> String {
    "Arcadia Core v0.0.1 Active".to_string()
}
