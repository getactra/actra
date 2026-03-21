export class Actra {
  constructor(wasm, memory, { schema, policy, governance }) {
    this.wasm = wasm;
    this.memory = memory;

    this.instanceId = this.#createInstance(schema, policy, governance);
  }

  #allocString(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);

    const ptr = this.wasm.actra_alloc(bytes.length);
    const mem = new Uint8Array(this.memory.buffer, ptr, bytes.length);
    mem.set(bytes);

    return { ptr, len: bytes.length };
  }

  #readBuffer(buffer) {
    const bytes = new Uint8Array(this.memory.buffer, buffer.ptr, buffer.len);
    const str = new TextDecoder().decode(bytes);

    this.wasm.actra_string_free(buffer.ptr, buffer.len);

    return str;
  }

  #callCreate(schema, policy, governance) {
    const s = this.#allocString(schema);
    const p = this.#allocString(policy);
    const g = governance ? this.#allocString(governance) : { ptr: 0, len: 0 };

    const buf = this.wasm.actra_create(
      s.ptr, s.len,
      p.ptr, p.len,
      g.ptr, g.len
    );

    return this.#readBuffer(buf);
  }

  #createInstance(schema, policy, governance) {
    const out = this.#callCreate(schema, policy, governance);
    const parsed = JSON.parse(out);

    if (parsed.ok === "false") {
      throw new Error(parsed.error);
    }

    return parseInt(parsed.data, 10);
  }

  evaluate(input) {
    const inputStr = JSON.stringify(input);
    const i = this.#allocString(inputStr);

    const buf = this.wasm.actra_evaluate(
      this.instanceId,
      i.ptr,
      i.len
    );

    const out = this.#readBuffer(buf);
    const parsed = JSON.parse(out);

    if (parsed.ok === "false") {
      throw new Error(parsed.error);
    }

    return parsed.data;
  }

  policyHash() {
    const buf = this.wasm.actra_policy_hash(this.instanceId);
    const out = this.#readBuffer(buf);
    const parsed = JSON.parse(out);

    if (parsed.ok === "false") {
      throw new Error(parsed.error);
    }

    return parsed.data;
  }

  free() {
    this.wasm.actra_free(this.instanceId);
  }
}