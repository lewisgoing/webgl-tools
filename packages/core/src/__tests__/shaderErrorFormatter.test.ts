import { ShaderErrorFormatter } from '../shaderErrorEnhanced';

describe('ShaderErrorFormatter', () => {
  const sampleVertexShader = `
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vNormal = normal;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}`;

  const sampleFragmentShader = `
precision mediump float;

uniform sampler2D diffuseMap;
uniform vec3 lightDirection;

varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vec3 normal = normalize(vNormal);
  float light = max(dot(normal, lightDirection), 0.0);
  vec4 texColor = texture2D(diffuseMap, vUv);
  gl_FragColor = vec4(texColor.rgb * light, texColor.a);
}`;

  const errorFragmentShader = `
precision mediump float;

uniform sampler2D diffuseMap;
varying vec2 vUv;

void main() {
  // Error: texture function requires 2 arguments
  vec4 color = texture(diffuseMap);
  
  // Error: undefined variable
  gl_FragColor = vec4(color.rgb * brightness, 1.0);
}`;

  describe('formatShaderError', () => {
    test('parses single error correctly', () => {
      const infoLog = 'ERROR: 0:8: texture : no matching overloaded function found';
      const result = ShaderErrorFormatter.formatShaderError(
        errorFragmentShader,
        infoLog,
        'fragment'
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        line: 8,
        message: "texture : no matching overloaded function found",
        type: 'error',
        source: 'fragment'
      });
    });

    test('parses multiple errors', () => {
      const infoLog = `ERROR: 0:8: texture : no matching overloaded function found
ERROR: 0:11: 'brightness' : undeclared identifier`;
      
      const result = ShaderErrorFormatter.formatShaderError(
        errorFragmentShader,
        infoLog,
        'fragment'
      );

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].line).toBe(8);
      expect(result.errors[1].line).toBe(11);
      expect(result.errors[1].message).toContain('brightness');
    });

    test('creates source with line numbers', () => {
      const result = ShaderErrorFormatter.formatShaderError(
        sampleVertexShader,
        '',
        'vertex'
      );

      expect(result.sourceWithLineNumbers).toContain('   1 |');
      expect(result.sourceWithLineNumbers).toContain('attribute vec3 position;');
    });

    test('formats error output with context', () => {
      const infoLog = 'ERROR: 0:8: texture : no matching overloaded function found';
      const result = ShaderErrorFormatter.formatShaderError(
        errorFragmentShader,
        infoLog,
        'fragment'
      );

      expect(result.formattedOutput).toContain('FRAGMENT SHADER COMPILATION FAILED');
      expect(result.formattedOutput).toContain('Error 1/1 at line 8:');
      expect(result.formattedOutput).toContain('texture : no matching overloaded function found');
      expect(result.formattedOutput).toContain('vec4 color = texture(diffuseMap);');
      expect(result.formattedOutput).toContain('Tips:');
    });

    test('handles empty error log', () => {
      const result = ShaderErrorFormatter.formatShaderError(
        sampleVertexShader,
        '',
        'vertex'
      );

      expect(result.errors).toHaveLength(0);
      expect(result.formattedOutput).toContain('VERTEX SHADER COMPILATION FAILED');
    });

    test('shows correct context lines', () => {
      const infoLog = 'ERROR: 0:5: some error';
      const result = ShaderErrorFormatter.formatShaderError(
        errorFragmentShader,
        infoLog,
        'fragment'
      );

      // Should show lines 2-8 (line 5 ± 3)
      expect(result.formattedOutput).toContain('precision mediump float');
      expect(result.formattedOutput).toContain('void main()');
    });
  });

  describe('formatShaderErrorHTML', () => {
    test('generates valid HTML', () => {
      const infoLog = 'ERROR: 0:8: texture : no matching overloaded function found';
      const html = ShaderErrorFormatter.formatShaderErrorHTML(
        errorFragmentShader,
        infoLog,
        'fragment'
      );

      expect(html).toContain('<div class="shader-error-panel">');
      expect(html).toContain('FRAGMENT SHADER ERROR');
      expect(html).toContain('<div class="shader-error-message">Line 8:');
      expect(html).toContain('texture : no matching overloaded function found');
    });

    test('applies syntax highlighting', () => {
      const html = ShaderErrorFormatter.formatShaderErrorHTML(
        sampleVertexShader,
        '',
        'vertex'
      );

      expect(html).toContain('<span class="glsl-type">uniform</span>');
      expect(html).toContain('<span class="glsl-type">mat4</span>');
      expect(html).toContain('<span class="glsl-builtin">gl_Position</span>');
    });

    test('marks error lines', () => {
      const infoLog = 'ERROR: 0:8: some error';
      const html = ShaderErrorFormatter.formatShaderErrorHTML(
        errorFragmentShader,
        infoLog,
        'fragment'
      );

      expect(html).toContain('class="shader-line error-line"');
      expect(html).toContain('<span class="line-number">8</span>');
    });

    test('handles comments in syntax highlighting', () => {
      const html = ShaderErrorFormatter.formatShaderErrorHTML(
        errorFragmentShader,
        '',
        'fragment'
      );

      expect(html).toContain('<span class="glsl-comment">// Error: texture function requires 2 arguments</span>');
    });
  });

  describe('getStyles', () => {
    test('returns CSS styles', () => {
      const styles = ShaderErrorFormatter.getStyles();
      
      expect(styles).toContain('.shader-error-panel');
      expect(styles).toContain('.shader-error-header');
      expect(styles).toContain('.glsl-type');
      expect(styles).toContain('Monaco');
      expect(styles).toContain('#c62828'); // Error color
    });
  });

  describe('edge cases', () => {
    test('handles shader with no newlines', () => {
      const singleLineShader = 'void main() { gl_FragColor = vec4(1.0); }';
      const infoLog = 'ERROR: 0:1: syntax error';
      
      const result = ShaderErrorFormatter.formatShaderError(
        singleLineShader,
        infoLog,
        'fragment'
      );

      expect(result.errors).toHaveLength(1);
      expect(result.formattedOutput).toContain('void main()');
    });

    test('handles very long error messages', () => {
      const longMessage = 'a'.repeat(200);
      const infoLog = `ERROR: 0:1: ${longMessage}`;
      
      const result = ShaderErrorFormatter.formatShaderError(
        sampleFragmentShader,
        infoLog,
        'fragment'
      );

      expect(result.errors[0].message).toHaveLength(200);
    });

    test('handles malformed error log', () => {
      const malformedLog = 'This is not a proper error format\nERROR without proper format';
      
      const result = ShaderErrorFormatter.formatShaderError(
        sampleFragmentShader,
        malformedLog,
        'fragment'
      );

      expect(result.errors).toHaveLength(0);
    });

    test('handles line numbers beyond shader length', () => {
      const infoLog = 'ERROR: 0:999: some error at non-existent line';
      
      const result = ShaderErrorFormatter.formatShaderError(
        sampleFragmentShader,
        infoLog,
        'fragment'
      );

      expect(result.errors[0].line).toBe(999);
      // Should handle gracefully without crashing
      expect(result.formattedOutput).toBeDefined();
    });
  });
});