# Contributing to MarketingMix AI

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Write/update tests
4. Ensure all tests pass: `npm test` (backend/frontend) or `pytest` (ML)
5. Run linters: `npm run lint` or `ruff check`
6. Commit with clear messages
7. Push and create a PR

## Branch Protection

- `main` branch is protected
- All PRs require:
  - Passing CI checks
  - At least one code review
  - No merge conflicts

## Code Standards

- **Backend**: ESLint + Prettier, TypeScript strict mode
- **Frontend**: ESLint + Prettier, React best practices
- **ML**: Black formatter, type hints, docstrings
- **Tests**: Minimum 60% coverage

## Commit Messages

Use conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

## PR Checklist

- [ ] Tests pass
- [ ] Linting passes
- [ ] No secrets in code
- [ ] API docs updated (if applicable)
- [ ] Changelog updated (if applicable)
