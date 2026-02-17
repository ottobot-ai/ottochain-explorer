# Git Workflow Guide - OttoChain Development

## Overview

OttoChain uses GitFlow branching strategy optimized for multi-environment deployment (development → staging → production). This document provides comprehensive guidelines for all developers.

## Branch Structure

### Main Branches

- **`main`**: Production-ready code
  - Protected branch with required reviews
  - All releases tagged from this branch
  - Direct pushes prohibited

- **`develop`**: Development integration branch
  - Latest development features
  - Base for all feature branches
  - Continuous integration testing

### Supporting Branches

#### Feature Branches
- **Naming**: `feat/description-of-feature`
- **Source**: `develop`
- **Merge Target**: `develop`
- **Lifetime**: Until feature complete

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feat/market-commit-fix

# Work on feature...
git add .
git commit -m "feat: fix market commit timing issues"
git push -u origin feat/market-commit-fix
```

#### Release Branches
- **Naming**: `release/v1.2.0`
- **Source**: `develop`
- **Merge Target**: `main` and `develop`
- **Lifetime**: Until release deployed

```bash
# Create release branch (from develop)
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# Final testing and bug fixes only
git commit -m "fix: final pre-release adjustments"
git push -u origin release/v1.2.0
```

#### Hotfix Branches
- **Naming**: `hotfix/critical-security-fix`
- **Source**: `main`
- **Merge Target**: `main` and `develop`
- **Lifetime**: Until critical fix deployed

```bash
# Emergency hotfix (from main)
git checkout main
git pull origin main
git checkout -b hotfix/memory-leak-fix

# Critical fix only
git commit -m "fix: resolve memory leak in ML0 layer"
git push -u origin hotfix/memory-leak-fix
```

## Development Workflow

### 1. Starting New Work

```bash
# Always start from latest develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feat/your-feature-name

# Make initial commit
git commit --allow-empty -m "feat: initialize your-feature-name"
git push -u origin feat/your-feature-name
```

### 2. During Development

```bash
# Regular commits with conventional format
git add .
git commit -m "feat: add delegation validation logic"

# Rebase frequently to stay current
git fetch origin
git rebase origin/develop

# Push changes
git push origin feat/your-feature-name
```

### 3. Ready for Review

```bash
# Final rebase before PR
git checkout develop
git pull origin develop
git checkout feat/your-feature-name
git rebase develop

# Ensure tests pass
sbt test

# Push and create PR
git push origin feat/your-feature-name
gh pr create --title "feat: Add delegation validation logic" \
  --body "Closes #123\n\n- Implements session key validation\n- Adds comprehensive test coverage" \
  --reviewer scasplte2
```

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: New feature
- **fix**: Bug fix  
- **docs**: Documentation changes
- **style**: Code style (formatting, no logic changes)
- **refactor**: Code restructuring (no feature changes)
- **test**: Adding/modifying tests
- **chore**: Maintenance tasks

### Examples
```bash
git commit -m "feat(delegation): add session key validation"
git commit -m "fix(bridge): resolve market commit timing race"
git commit -m "docs: update deployment guide"
git commit -m "test(fiber): add comprehensive lifecycle tests"
```

## Pull Request Guidelines

### PR Title Format
- Use conventional commit format
- Be descriptive and specific
- Reference issue numbers when applicable

### PR Template Usage
We provide three PR templates (automatically selected based on branch name):

1. **Feature PR** (`feat/*` branches)
2. **Release PR** (`release/*` branches)  
3. **Hotfix PR** (`hotfix/*` branches)

### Review Requirements

#### Feature PRs
- ✅ 1+ approving review required
- ✅ All CI checks must pass
- ✅ Tests must maintain >70% coverage
- ✅ Code style checks must pass

#### Release PRs  
- ✅ 2+ approving reviews required
- ✅ All integration tests pass
- ✅ Staging deployment successful
- ✅ Release notes complete

#### Hotfix PRs
- ✅ 1+ approving review (expedited)
- ✅ Critical tests pass
- ✅ Production impact assessment
- ✅ Rollback plan documented

## Release Process

### 1. Preparation (Weekly)
```bash
# Create release branch
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# Update version files
echo "1.2.0" > version.sbt
git commit -m "chore: bump version to 1.2.0"
git push -u origin release/v1.2.0
```

### 2. Testing & Deployment
- Deploy to staging environment
- Run comprehensive integration tests
- Fix any critical issues in release branch

### 3. Release Completion
```bash
# Merge to main (via PR)
gh pr create --title "release: v1.2.0" \
  --body "Release v1.2.0 with features X, Y, Z" \
  --base main --head release/v1.2.0

# After merge and tag, merge back to develop
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

## Environment-Specific Considerations

### Development Environment
- All feature branches deploy automatically
- Rapid iteration and testing
- Shared environment for integration

### Staging Environment  
- Release branches only
- Production-like configuration
- Final validation before production

### Production Environment
- `main` branch only
- Manual deployment approval
- Monitoring and rollback procedures

## Collaboration Guidelines

### Code Review Best Practices

#### For Authors
- Keep PRs focused and reasonably sized (<500 lines)
- Provide clear descriptions and context
- Respond to feedback promptly
- Test thoroughly before requesting review

#### For Reviewers
- Review promptly (within 24 hours)
- Focus on logic, security, and maintainability
- Be constructive and specific with feedback
- Approve when ready, request changes when needed

### Conflict Resolution
```bash
# Resolve merge conflicts during rebase
git rebase origin/develop
# Fix conflicts in editor
git add conflicted-file.scala
git rebase --continue

# Alternative: merge strategy (discouraged)
git merge origin/develop
```

## Emergency Procedures

### Critical Production Bug
1. Create hotfix branch from `main`
2. Implement minimal fix
3. Create expedited PR with hotfix template
4. Deploy to production immediately after approval
5. Merge hotfix back to `develop`

### Failed Release
1. Stop deployment immediately
2. Create rollback PR if needed
3. Investigate issue in separate branch
4. Implement fix and validate in staging
5. Create new release branch

## Tools and Automation

### Required Tools
- `git` (>= 2.30)
- `gh` CLI for GitHub operations
- `sbt` for Scala builds
- Pre-commit hooks (configured automatically)

### Useful Aliases
```bash
# Add to ~/.gitconfig
[alias]
    co = checkout
    br = branch
    ci = commit
    st = status
    unstage = reset HEAD --
    last = log -1 HEAD
    visual = !gitk
    pushup = push -u origin HEAD
    pullreb = pull --rebase origin
    conflicts = diff --name-only --diff-filter=U
```

## Troubleshooting

### Common Issues

#### "Merge conflicts during rebase"
```bash
git status  # See conflicted files
# Edit files to resolve conflicts
git add resolved-file.scala
git rebase --continue
```

#### "Your branch is behind origin/develop"
```bash
git pull --rebase origin develop
git push origin feat/your-feature --force-with-lease
```

#### "PR checks failing"
```bash
# Run tests locally
sbt test

# Fix style issues  
sbt scalafmtAll

# Check coverage
sbt coverage test coverageReport
```

## Migration Guide

This section helps transition existing development to the new GitFlow model:

### For Existing Feature Work
1. Create backup branches
2. Rebase feature branches onto `develop`
3. Rename branches to follow new conventions
4. Update PR targets from `main` to `develop`

### Branch Cleanup
```bash
# List all local branches
git branch -a

# Delete merged feature branches
git branch -d feat/old-feature

# Delete remote tracking branches
git remote prune origin
```

---

**Questions or Issues?**
- Create issue in repo with `question` label
- Ask in team Slack `#development` channel  
- Review this guide regularly for updates