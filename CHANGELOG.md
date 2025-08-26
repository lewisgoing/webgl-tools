# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added
- Initial release of WebGL Debugging Toolkit
- Core debugging functionality with minimal overhead
- Three performance modes: off, sampled, and full
- Real-time metrics: FPS, draw calls, triangles, texture binds
- WebGL resource tracking with memory estimation
- GPU timer support for WebGL1 and WebGL2
- Enhanced shader error formatting with line highlighting
- Framebuffer inspector with pixel analysis
- Hierarchical GPU timing system
- Comprehensive performance profiler
- Three.js integration adapter
- React-based debug overlay
- Comprehensive test coverage (154 tests)
- Full TypeScript support
- ESM and CommonJS builds

### Performance
- Sampled mode overhead: <0.1ms per frame
- Full mode overhead: <0.5ms per frame
- Zero overhead in 'off' mode

### Compatibility
- WebGL 1.0 and 2.0 support
- Works with all major browsers
- Node.js 18+ for development
- Three.js r150+ for adapter