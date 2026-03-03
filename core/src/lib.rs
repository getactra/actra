//! # ActionGate
//!
//! Deterministic admission control engine for production mutations.
//!
//! ActionGate compiles declarative policy definitions into a validated,
//! immutable intermediate representation (IR) that can be evaluated
//! efficiently against runtime inputs.
//!
//! ## Design Goals
//! - Deterministic evaluation
//! - Strict compile-time validation
//! - Clear separation between DSL, compiler and runtime
//! - Runtime-agnostic core
//!
//! ## Embedding Targets
//! - Python (via `pyo3` feature)
//! - Node.js (via `napi` feature)
//! - Future WASM targets
//!
//! The core engine contains no unsafe code and performs no dynamic
//! validation during evaluation. All semantic guarantees are enforced
//! at compile time.
//! 
#![allow(unsafe_op_in_unsafe_fn)]
#![deny(unsafe_code)] 
//#![deny(missing_docs)] // Enable in future when public API stabilizes
#![warn(clippy::all)]
#![warn(clippy::pedantic)]
#![allow(clippy::module_name_repetitions)]

pub mod schema;
pub mod ast;
pub mod errors;
pub mod governance;
pub mod compiler;
pub mod ir;
pub mod engine;

/// Compiler version derived from crate version
pub const COMPILER_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Returns the compiler version string.
pub fn compiler_version() -> &'static str {
    COMPILER_VERSION
}