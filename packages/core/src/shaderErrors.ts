export interface SourceChunk { file: string; code: string; }
export interface MappedSource { code: string; map: { glslLine: number; file: string; fileLine: number }[]; }

// Concatenate chunks with #line so GL error logs map back to files
export function concatWithLineDirectives(chunks: SourceChunk[]): MappedSource {
  const map: { glslLine: number; file: string; fileLine: number }[] = [];
  let code = '';
  let glslLine = 1;
  for (const ch of chunks) {
    code += `#line 1\n`;               // reset to 1 for file
    const lines = ch.code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      map.push({ glslLine, file: ch.file, fileLine: i+1 });
      code += lines[i] + '\n';
      glslLine++;
    }
  }
  return { code, map };
}

export interface ParsedError { file: string; line: number; message: string; raw: string; }
export function parseGLSLInfoLog(info: string, mapped: MappedSource): ParsedError[] {
  // Handles "ERROR: 0:123: message" and similar
  const out: ParsedError[] = [];
  const re = /ERROR:\s*\d+:(\d+):\s*(.*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(info)) !== null) {
    const glslLine = parseInt(m[1], 10);
    const entry = mapped.map.find(e => e.glslLine === glslLine);
    if (entry) out.push({ file: entry.file, line: entry.fileLine, message: m[2], raw: m[0] });
  }
  return out;
}