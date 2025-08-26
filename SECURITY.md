# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of WebGL Tools seriously. If you have discovered a security vulnerability in this project, please report it to us by:

1. **Email**: Send details to security@[yourdomain].com
2. **GitHub Security Advisory**: Use GitHub's security advisory feature

Please include the following information:
- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact assessment

## Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days
- **Resolution Target**: Within 30 days for critical vulnerabilities

## Security Best Practices

When using WebGL Tools:

1. **Never log sensitive data**: The toolkit may log WebGL state and errors
2. **Disable in production**: Use `mode: 'off'` or `mode: 'sampled'` with low sample rates
3. **Validate inputs**: Always validate data before passing to WebGL
4. **Content Security Policy**: Configure CSP headers appropriately

## Known Security Considerations

- **Performance data**: May reveal information about client hardware
- **Shader sources**: Error messages may include shader source code
- **Resource tracking**: Tracks WebGL resource allocation patterns

## Disclosure Policy

- Security issues will be disclosed publicly after a fix is available
- Credit will be given to reporters (unless anonymity is requested)
- A security advisory will be published via GitHub