export interface ProgramMeta {
  file?: string; pass?: string; variant?: string;
  defines?: Record<string,string>;
}

export function attachSpectorMetadata(program: WebGLProgram, meta: ProgramMeta) {
  (program as any).__SPECTOR_Metadata = { ...meta, ts: Date.now() };
}