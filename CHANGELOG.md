### v0.7.3 - 27 March 2026
- added helper `requiresApproval` for js
- added helper `requires_approval` for python
- added examples for js sdk
    * helpers
    * runtime
- added `requires_approval` example for python

### v0.7.2 - 26 March 2026
- js sdk support for multi runtime, packaging updates
- js sdk update for parity as per py sdk behavior
- examples added for js sdk
- test for js sdk updated
- added field extraction from schema in js sdk runtime
- updated js sdk policy, added following :  
    * `getSchema`
    * `hasSchema`
    * `assertEffect`
    * `evaluateAction`
    * `explain`
- updated js sdk runtime, added following :
    * updated `normalizeArgs` to support schema driven fields mapping & object style input
    * added `block`
    * `allow` to support schema driven field mappings
    * `admit` to support schema driven field mappings
    * `audit` to support schema driven field mappings
    * added `explain`
    * added `explainCall`
    * added `action`

### v0.7.1 - 24 March 2026
- updated loader for multi js runtime support
- updated js sdk to support multi runtime export as per runtimes
- restructured js sdk for publishing
- combined common with main js sdk 
- updated error handling for loader

### v0.7.0 - 22 March 2026
- updated wasm abi raw memory management exports
- added benchmark script for wasm abi testing for wasm bindings
- updated loader and tests to support new raw wasm exports
- updated js sdk with raw memory implementation
- major js sdk structure refactor with test

### v0.6.2 - 21 March 2026
- removed wasm bindgen
- updated wasm bindings for raw wasm abi support
- added raw tests for wasm abi js wrapper

### v0.6.1 - 19 March 2026
- added wasm bindings for Node, Bun, Browser, Deno and Edge
- Bug fix in wasm binding

### v0.6 - 18 March 26
- added has_decision_observer in runtime : Python SDK
- Fixed Rust engine bugs
- Support for JS server sdk

### v0.5.1
- wasm bindings added

### v5.0 
- Support for MCP, Agents and LLM integrations in Python SDK

### v0.4.0 & Earlier
- Bug fixes
- Added Error class in Python SDK
- Python SDK
- Initial release with core rust engine
