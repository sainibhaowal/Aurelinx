# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please
report it responsibly.

**Do not** create a public GitHub issue for security vulnerabilities.

### How to Report

Email: **security@aurelinx.com**

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Your contact information

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Fix Timeline**: Depends on severity
  - Critical: Within 7 days
  - High: Within 14 days
  - Medium: Within 30 days
  - Low: Next scheduled release

### Disclosure Policy

- We will coordinate disclosure with you
- Public disclosure after fix is released
- Credit given to reporter (unless anonymity requested)

## Security Measures

### Application Security
- All dependencies scanned with `pip-audit`, `npm audit`, `cargo audit`
- SAST scanning in CI pipeline
- Dependency pinning with hash verification
- Regular security updates

### Infrastructure Security
- TLS 1.3 for all external communications
- Secrets managed via environment variables / vault
- Principle of least privilege for service accounts
- Regular penetration testing

### Data Protection
- PII encryption at rest and in transit
- GDPR/CCPA compliance considerations
- Audit logging for sensitive operations
- Data retention and deletion policies

## Secure Development Practices

### For Contributors
- Never commit secrets, API keys, or credentials
- Use `.env.example` for configuration templates
- Run security linters before committing
- Keep dependencies updated

### For Maintainers
- Review dependency changes carefully
- Require 2FA for repository access
- Signed commits required for releases
- Automated security scanning on every PR

## Bug Bounty

We do not currently offer a formal bug bounty program, but we acknowledge
security researchers in our Hall of Fame and release notes.

## Contact

Security Team: security@aurelinx.com
PGP Key: Available on request