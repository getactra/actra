export class ActraWasmABI {
  constructor(wasm, memory) {
    this.wasm = wasm;
    this.memory = memory;
  }

  //Buffer primitives

  writeBuffer(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);

    const ptr = this.wasm.actra_write_buffer(bytes.length);
    new Uint8Array(this.memory.buffer).set(bytes, ptr);

    return this.wasm.actra_buffer_from_js(ptr, bytes.length);
  }

  readBuffer(buf) {
    const ptr = Number(buf >> 32n);
    const len = Number(buf & 0xffffffffn);

    const bytes = new Uint8Array(this.memory.buffer, ptr, len);
    const str = new TextDecoder().decode(bytes);

    this.wasm.actra_buffer_free(ptr);

    return str;
  }

  //Core exports

  actra_create(schemaBuf, policyBuf, govBuf) {
    return this.wasm.actra_create(schemaBuf, policyBuf, govBuf);
  }

  actra_evaluate(instanceId, inputBuf) {
    return this.wasm.actra_evaluate(instanceId, inputBuf);
  }

  actra_policy_hash(instanceId) {
    return this.wasm.actra_policy_hash(instanceId);
  }

  actra_compiler_version() {
    return this.wasm.actra_compiler_version();
  }

  actra_free(instanceId) {
    this.wasm.actra_free(instanceId);
  }

  // Raw buffer ops

  actra_buffer_from_js(ptr, len) {
    return this.wasm.actra_buffer_from_js(ptr, len);
  }

  actra_buffer_free(ptr) {
    this.wasm.actra_buffer_free(ptr);
  }

  actra_write_buffer(len) {
    return this.wasm.actra_write_buffer(len);
  }
}