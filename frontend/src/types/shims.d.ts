/// <reference types="vite/client" />

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>
  on(event: string, handler: (...args: any[]) => void): void
  removeListener(event: string, handler: (...args: any[]) => void): void
}

interface Window {
  ethereum?: EthereumProvider
}

declare module 'circomlibjs' {
  export function buildPoseidon(): Promise<{
    (inputs: bigint[]): unknown
    F: {
      toString(value: unknown): string
      toObject(value: unknown): bigint
    }
  }>
}

declare module 'snarkjs' {
  export namespace groth16 {
    export function fullProve(
      input: Record<string, unknown>,
      wasmPath: string,
      zkeyPath: string
    ): Promise<{ proof: Groth16Proof; publicSignals: string[] }>
    export function verify(
      verificationKey: unknown,
      publicSignals: string[],
      proof: Groth16Proof
    ): Promise<boolean>
  }
}

interface Groth16Proof {
  pi_a: string[]
  pi_b: string[][]
  pi_c: string[]
  protocol: string
  curve: string
}
