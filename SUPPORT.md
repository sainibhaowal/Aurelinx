# Support

## Getting Help

### Documentation
- **README**: Quick start and overview
- **Wiki**: Detailed guides and tutorials
- **API Docs**: `/docs` endpoint when running locally

### Community Support
- **GitHub Discussions**: Questions, ideas, general help
- **Discord**: Real-time chat (link in repo description)
- **Stack Overflow**: Tag `aurelinx`

### Professional Support
- **Email**: support@aurelinx.com
- **Response SLA**: 2 business days (business hours UTC)
- **Enterprise**: Custom SLAs available

## Issue Triage

### Bug Reports
Use the bug report template. Include:
- Minimal reproduction
- Environment details
- Expected vs actual behavior

### Feature Requests
Use the feature request template. Explain:
- Problem being solved
- Proposed solution
- Alternatives considered

### Questions
- Search existing issues/discussions first
- Use GitHub Discussions for open-ended questions
- Tag `question` label

## Response Expectations

| Type | Initial Response | Resolution |
|------|-----------------|------------|
| Security | 48 hours | Per [SECURITY.md](SECURITY.md) |
| Critical Bug | 24 hours | Next patch release |
| Standard Bug | 5 business days | Next minor release |
| Feature Request | 10 business days | Roadmap consideration |
| Question | 3 business days | Answer or redirect |

## Self-Service Resources

### Common Issues
| Problem | Solution |
|---------|----------|
| Build fails | Check Node/Python/Rust versions match requirements |
| Tests fail | Run `make clean && make install` to reset |
| Docker issues | `docker system prune -a` then rebuild |
| Port conflicts | Check `.env` for port configuration |

### Debugging Tips
- Enable debug logging: `LOG_LEVEL=DEBUG`
- Check service health: `curl localhost:8000/health`
- View logs: `docker compose logs -f [service]`

## Contributing to Support

Help improve support by:
- Answering questions in Discussions
- Improving documentation
- Creating tutorials/examples
- Reporting unclear error messages

## Commercial Support

For enterprise customers:
- Dedicated support channels
- Priority bug fixes
- Custom feature development
- On-premise deployment assistance
- Security audit assistance

Contact: enterprise@aurelinx.com