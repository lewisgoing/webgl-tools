export interface ShaderErrorInfo {
  line: number;
  column?: number;
  message: string;
  type: 'error' | 'warning';
  source?: string;
}

export interface EnhancedShaderError {
  errors: ShaderErrorInfo[];
  formattedOutput: string;
  sourceWithLineNumbers: string;
}

/**
 * Enhanced shader error formatter with syntax highlighting and context
 */
export class ShaderErrorFormatter {
  private static readonly CONTEXT_LINES = 3;
  
  static formatShaderError(
    source: string, 
    infoLog: string,
    shaderType: 'vertex' | 'fragment'
  ): EnhancedShaderError {
    // Parse error log manually
    const errors: ShaderErrorInfo[] = [];
    const errorRegex = /ERROR:\s*\d+:(\d+):\s*(.*)/g;
    let match;
    
    while ((match = errorRegex.exec(infoLog)) !== null) {
      errors.push({
        line: parseInt(match[1], 10),
        message: match[2],
        type: 'error',
        source: shaderType
      });
    }
    const lines = source.split('\n');
    
    // Create source with line numbers
    const sourceWithLineNumbers = lines
      .map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`)
      .join('\n');
    
    // Create formatted output with error context
    const formattedSections: string[] = [];
    
    // Header
    formattedSections.push(
      `\n🔴 ${shaderType.toUpperCase()} SHADER COMPILATION FAILED\n` +
      `${'═'.repeat(50)}\n`
    );
    
    // Process each error
    errors.forEach((error, idx) => {
      const lineNum = error.line - 1; // Convert to 0-based
      
      formattedSections.push(
        `\n❌ Error ${idx + 1}/${errors.length} at line ${error.line}:\n` +
        `   ${error.message}\n\n`
      );
      
      // Show context around error
      const startLine = Math.max(0, lineNum - this.CONTEXT_LINES);
      const endLine = Math.min(lines.length - 1, lineNum + this.CONTEXT_LINES);
      
      for (let i = startLine; i <= endLine; i++) {
        const lineNumber = String(i + 1).padStart(4, ' ');
        const isErrorLine = i === lineNum;
        const prefix = isErrorLine ? '>' : ' ';
        const line = lines[i];
        
        // Format the line
        let formattedLine = `${prefix} ${lineNumber} | ${line}`;
        
        // Highlight error line
        if (isErrorLine) {
          formattedLine = `\x1b[31m${formattedLine}\x1b[0m`; // Red color
          
          // Add simple pointer line
          const pointerLine = ' '.repeat(8) + '^^^';
          formattedLine += `\n\x1b[31m${pointerLine}\x1b[0m`;
        }
        
        formattedSections.push(formattedLine);
      }
      
      formattedSections.push('\n');
    });
    
    // Footer with tips
    formattedSections.push(
      `${'─'.repeat(50)}\n` +
      `💡 Tips:\n` +
      `   • Check uniform/varying declarations match between shaders\n` +
      `   • Verify all variables are declared before use\n` +
      `   • Ensure correct GLSL version syntax\n`
    );
    
    return {
      errors: errors.map(e => ({
        ...e,
        type: e.message.toLowerCase().includes('warning') ? 'warning' : 'error',
        source: shaderType
      })),
      formattedOutput: formattedSections.join(''),
      sourceWithLineNumbers
    };
  }
  
  /**
   * Format for HTML display (used in overlay)
   */
  static formatShaderErrorHTML(
    source: string,
    infoLog: string,
    shaderType: 'vertex' | 'fragment'
  ): string {
    const result = this.formatShaderError(source, infoLog, shaderType);
    const lines = source.split('\n');
    
    // Create HTML with syntax highlighting
    const errorLines = new Set(result.errors.map(e => e.line));
    
    const html = lines.map((line, idx) => {
      const lineNum = idx + 1;
      const isError = errorLines.has(lineNum);
      const className = isError ? 'error-line' : '';
      
      // Basic syntax highlighting
      let highlighted = line
        .replace(/\b(uniform|varying|attribute|const|void|float|vec2|vec3|vec4|mat2|mat3|mat4|sampler2D|samplerCube)\b/g, 
          '<span class="glsl-type">$1</span>')
        .replace(/\b(gl_Position|gl_FragColor|gl_FragCoord)\b/g, 
          '<span class="glsl-builtin">$1</span>')
        .replace(/\/\/.*$/g, 
          '<span class="glsl-comment">$&</span>');
      
      return `<div class="shader-line ${className}">
        <span class="line-number">${lineNum}</span>
        <span class="line-content">${highlighted}</span>
      </div>`;
    }).join('\n');
    
    // Add error messages
    const errorMessages = result.errors.map(e => 
      `<div class="shader-error-message">Line ${e.line}: ${e.message}</div>`
    ).join('\n');
    
    return `
      <div class="shader-error-panel">
        <div class="shader-error-header">
          ${shaderType.toUpperCase()} SHADER ERROR
        </div>
        <div class="shader-error-messages">
          ${errorMessages}
        </div>
        <div class="shader-source">
          ${html}
        </div>
      </div>
    `;
  }
  
  /**
   * Get CSS for shader error display
   */
  static getStyles(): string {
    return `
      .shader-error-panel {
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        background: #1e1e1e;
        color: #d4d4d4;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .shader-error-header {
        background: #c62828;
        color: white;
        padding: 8px 12px;
        font-weight: bold;
      }
      
      .shader-error-messages {
        background: #2d2d2d;
        padding: 8px 12px;
        border-bottom: 1px solid #444;
      }
      
      .shader-error-message {
        color: #f48fb1;
        margin: 4px 0;
      }
      
      .shader-source {
        padding: 12px 0;
        overflow-x: auto;
      }
      
      .shader-line {
        display: flex;
        padding: 2px 0;
      }
      
      .shader-line.error-line {
        background: #5a1e1e;
      }
      
      .line-number {
        width: 40px;
        text-align: right;
        padding-right: 12px;
        color: #858585;
        user-select: none;
      }
      
      .line-content {
        flex: 1;
        padding-right: 12px;
      }
      
      .glsl-type {
        color: #569cd6;
      }
      
      .glsl-builtin {
        color: #4ec9b0;
      }
      
      .glsl-comment {
        color: #6a9955;
        font-style: italic;
      }
    `;
  }
}