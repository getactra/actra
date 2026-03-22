import { ActraError } from "@actra/common";
import { loadActraWasm } from "./wasm-loader";
import type { ActraWasmExports, ActraWasmModule } from "./wasm-loader";

type RawResponse<T> = {
    ok: "true" | "false";
    data?: T;
    error?: string;
};

export type WasmDecision = {
    effect: string;
    matched_rule: string | null;
};

function normalizeRule(rule: string | null | undefined): string | null {
  return !rule ? null : rule;
}

export class ActraWasm {
    private wasm: ActraWasmExports;
    private memory: WebAssembly.Memory;

    private encoder = new TextEncoder();
    private decoder = new TextDecoder();

    private constructor(instance: ActraWasmModule) {
        this.wasm = instance.exports;
        this.memory = instance.memory;

        this.validate();
    }

    // loader

    static async load(
        path: string | URL = new URL("./actra_wasm.wasm", import.meta.url)
    ): Promise<ActraWasm> {
        const instance = await loadActraWasm(path);
        return new ActraWasm(instance);
    }

    // validation

    private validate() {
        try {
            const test = this.wasm.actra_compiler_version();

            if (typeof test !== "bigint") {
                throw new ActraError(
                    "WASM i64 is not mapped to BigInt. Use modern runtime."
                );
            }
        } catch (e: any) {
            throw new ActraError(
                "WASM BigInt support failed.\n" + (e?.message ?? e)
            );
        }
    }

    // buffer helpers

    private toBuffer(str: string): bigint {
        const bytes = this.encoder.encode(str);

        const ptr = this.wasm.actra_write_buffer(bytes.length);

        const mem = new Uint8Array(this.memory.buffer);
        mem.set(bytes, ptr);

        return this.wasm.actra_buffer_from_js(ptr, bytes.length);
    }

    private readBuffer(val: bigint): string {
        const ptr = Number(val >> 32n);
        const len = Number(val & 0xffffffffn);

        if (!ptr || len <= 0) {
            throw new ActraError("Invalid WASM buffer");
        }

        const bytes = new Uint8Array(this.memory.buffer, ptr, len);
        const str = this.decoder.decode(bytes);

        this.wasm.actra_buffer_free(ptr);

        return str;
    }

    private parseResponse<T>(buf: bigint): T {
        const str = this.readBuffer(buf);

        let parsed: RawResponse<T>;

        try {
            parsed = JSON.parse(str);
        } catch {
            throw new ActraError("Invalid JSON response from Actra runtime engine");
        }

        if (parsed.ok !== "true") {
            throw new ActraError(parsed.error || "Actra JSON parse error");
        }

        if (parsed.data === undefined) {
            throw new ActraError("Invalid Actra runtime engine response: missing data");
        }

        return parsed.data;
    }

    // public api

    create(
        schema: string,
        policy: string,
        governance?: string
    ): number {
        if (!schema?.trim()) {
            throw new ActraError("Schema cannot be empty");
        }

        if (!policy?.trim()) {
            throw new ActraError("Policy cannot be empty");
        }

        const schemaBuf = this.toBuffer(schema);
        const policyBuf = this.toBuffer(policy);
        const govBuf = governance ? this.toBuffer(governance) : 0n;

        const res = this.wasm.actra_create(
            schemaBuf,
            policyBuf,
            govBuf
        );

        if (!res) {
            throw new ActraError("actra_create failed");
        }

        const id = Number(this.parseResponse<string>(res));

        if (!Number.isFinite(id)) {
            throw new ActraError("Invalid instance ID from Actra runtime engine");
        }

        return id;
    }

    evaluate(
        instanceId: number,
        input: unknown
    ): WasmDecision {
        const inputBuf = this.toBuffer(JSON.stringify(input));

        const res = this.wasm.actra_evaluate(
            instanceId,
            inputBuf
        );

        if (!res) {
            throw new ActraError("actra_evaluate failed");
        }

        const data = this.parseResponse<{
            effect: string;
            matched_rule: string | null;
        }>(res);

        return {
            effect: data.effect,
            matched_rule:
                data.matched_rule === "" || data.matched_rule == null
                    ? null
                    : data.matched_rule
        };
    }

    policyHash(instanceId: number): string {
        const res = this.wasm.actra_policy_hash(instanceId);

        if (!res) {
            throw new ActraError("actra_policy_hash failed");
        }

        return this.parseResponse<string>(res);
    }

    compilerVersion(): string {
        const res = this.wasm.actra_compiler_version();

        if (!res) {
            throw new ActraError("actra_compiler_version failed");
        }

        return this.parseResponse<string>(res);
    }

    free(instanceId: number) {
        this.wasm.actra_free(instanceId);
    }
}