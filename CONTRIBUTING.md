# Contributing to WebGL Debugging Toolkit

We love your input! We want to make contributing to WebGL Debugging Toolkit as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with Github

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## We Use [Github Flow](https://guides.github.com/introduction/flow/index.html)

All code changes happen through pull requests. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code follows the existing style.
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project.

## Report bugs using Github's [issues](https://github.com/your-username/webgl-tools/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/your-username/webgl-tools/issues/new).

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can.
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Development Process

1. **Setup Development Environment**
   ```bash
   git clone https://github.com/your-username/webgl-tools.git
   cd webgl-tools
   pnpm install
   pnpm build:packages
   ```

2. **Make Your Changes**
   - Create a new branch: `git checkout -b feature/your-feature-name`
   - Make your changes
   - Add tests for new functionality
   - Update documentation as needed

3. **Run Tests**
   ```bash
   # Run all tests
   pnpm test
   
   # Run unit tests
   pnpm test:unit
   
   # Run E2E tests
   pnpm test:e2e
   
   # Check code style
   pnpm lint
   ```

4. **Submit Pull Request**
   - Commit your changes with clear commit messages
   - Push to your fork
   - Create a pull request with a clear title and description

## Code Style

- Use TypeScript for all new code
- Follow existing code formatting (we use Prettier)
- Write meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Testing

- Write unit tests for new functionality
- Maintain or improve code coverage
- Test edge cases and error conditions
- Integration tests for feature interactions

## Project Structure

```
webgl-tools/
├── packages/
│   ├── core/          # Core debugging functionality
│   ├── overlay/       # React overlay UI
│   ├── three-adapter/ # Three.js integration
│   └── ...
├── apps/
│   └── playground/    # Demo application
├── docs/             # Documentation
└── e2e/              # End-to-end tests
```

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## Questions?

Feel free to open an issue with your questions or reach out to the maintainers.

Thank you for contributing to WebGL Debugging Toolkit! 🎉