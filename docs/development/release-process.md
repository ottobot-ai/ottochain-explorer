# Release Process - OttoChain

## Overview

This document outlines the complete release process for OttoChain, covering version management, testing, deployment, and rollback procedures across development, staging, and production environments.

## Release Cycle

### Schedule
- **Minor Releases**: Weekly (v1.1.0, v1.2.0, etc.)
- **Patch Releases**: As needed (v1.1.1, v1.1.2, etc.)
- **Major Releases**: Quarterly (v2.0.0, v3.0.0, etc.)

### Version Strategy
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes or significant architecture updates
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

## Pre-Release Checklist

### Code Quality Gates
- [ ] All tests pass (`sbt test`)
- [ ] Code coverage ≥70% (`sbt coverage test coverageReport`)
- [ ] No critical security vulnerabilities
- [ ] Performance benchmarks within acceptable ranges
- [ ] Documentation updated for new features

### Feature Completeness
- [ ] All planned features implemented and tested
- [ ] Breaking changes documented with migration guide
- [ ] API changes reflected in SDK and services
- [ ] Database migrations tested (if applicable)

### Environment Readiness
- [ ] Development environment stable
- [ ] Staging environment provisioned and configured
- [ ] Production deployment scripts validated
- [ ] Monitoring and alerting configured

## Release Process Steps

### Phase 1: Release Branch Creation

```bash
# 1. Ensure develop is ready
git checkout develop
git pull origin develop

# 2. Create release branch
git checkout -b release/v1.2.0

# 3. Update version files
echo "1.2.0" > version.sbt
git commit -m "chore: bump version to 1.2.0"

# 4. Push release branch
git push -u origin release/v1.2.0
```

### Phase 2: Release Testing

#### Automated Testing
```bash
# Run full test suite
sbt test

# Run integration tests
sbt it:test

# Performance tests
sbt "testOnly *PerformanceSpec"

# Security scan
sbt dependencyCheck
```

#### Staging Deployment
```bash
# Deploy to staging
cd ../ottochain-deploy
./deploy-staging.sh v1.2.0

# Validate deployment
./scripts/health-check.sh staging
./scripts/smoke-test.sh staging
```

#### Manual Validation Checklist
- [ ] **Core Functionality**: Create/transition fibers successfully
- [ ] **Bridge API**: All endpoints responding correctly
- [ ] **Explorer UI**: Data displaying properly
- [ ] **SDK Integration**: Client libraries working
- [ ] **Performance**: Response times within SLA
- [ ] **Security**: Authentication and authorization working

### Phase 3: Release Candidate

```bash
# Tag release candidate
git tag -a v1.2.0-rc1 -m "Release candidate 1.2.0-rc1"
git push origin v1.2.0-rc1

# Build and test RC artifacts
sbt clean assembly
./scripts/test-jar-deployment.sh target/scala-*/ottochain-assembly-*.jar
```

#### Stakeholder Review
- [ ] Technical review by lead developers
- [ ] Business validation by product team
- [ ] Security review for sensitive changes
- [ ] Documentation review for completeness

### Phase 4: Final Release

#### Merge to Main
```bash
# Create release PR
gh pr create --title "release: v1.2.0" \
  --body "$(cat CHANGELOG.md | head -20)" \
  --base main \
  --head release/v1.2.0 \
  --reviewer scasplte2

# After approval and merge:
git checkout main
git pull origin main
```

#### Create Release Tag
```bash
# Tag final release
git tag -a v1.2.0 -m "Release v1.2.0

Major Changes:
- Feature A: Description
- Feature B: Description
- Fix C: Description

Breaking Changes:
- API change in module X

Migration Guide: docs/migration/v1.1-to-v1.2.md"

git push origin v1.2.0
```

#### Build Release Artifacts
```bash
# Build JAR artifacts
sbt clean assembly

# Upload to GitHub Releases
gh release create v1.2.0 \
  --title "OttoChain v1.2.0" \
  --notes-from-tag \
  target/scala-*/ottochain-assembly-*.jar
```

### Phase 5: Production Deployment

#### Pre-Deployment
```bash
# Backup current production state
./scripts/backup-production.sh

# Prepare rollback plan
./scripts/prepare-rollback.sh v1.1.5  # Previous version

# Final health check
./scripts/health-check.sh production
```

#### Deployment Execution
```bash
# Deploy to production (manual approval required)
./deploy-production.sh v1.2.0

# Monitor deployment
./scripts/deployment-monitor.sh v1.2.0

# Run post-deployment checks
./scripts/smoke-test.sh production
./scripts/performance-test.sh production
```

#### Post-Deployment
- [ ] All services healthy and responding
- [ ] Performance metrics within expected ranges  
- [ ] Error rates below baseline thresholds
- [ ] User-facing features working correctly
- [ ] Monitoring dashboards updated

### Phase 6: Release Finalization

```bash
# Merge release back to develop
git checkout develop
git pull origin develop
git merge main --no-ff
git push origin develop

# Clean up release branch
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0

# Update project documentation
./scripts/update-version-docs.sh v1.2.0
```

## Multi-Repository Coordination

### Cross-Repo Dependencies
OttoChain ecosystem includes multiple repositories that must be released in coordination:

1. **ottochain** (core metagraph)
2. **ottochain-sdk** (client libraries)  
3. **ottochain-services** (bridge/indexer/explorer)
4. **ottochain-deploy** (infrastructure)

### Release Sequence
```bash
# 1. Update SDK first (breaking changes)
cd ../ottochain-sdk
git checkout release/v1.2.0
gh release create v1.2.0

# 2. Update services to use new SDK
cd ../ottochain-services  
npm update @ottochain/sdk
git commit -m "chore: update SDK to v1.2.0"

# 3. Release core metagraph
cd ../ottochain
# Follow standard release process

# 4. Update deployment configs
cd ../ottochain-deploy
# Update version references and deploy
```

## Rollback Procedures

### Rollback Triggers
- Critical production bugs affecting users
- Performance degradation >50% from baseline
- Security vulnerabilities discovered post-deployment
- Data integrity issues

### Immediate Rollback
```bash
# Stop current deployment
./scripts/stop-deployment.sh

# Rollback to previous version
./scripts/rollback-production.sh v1.1.5

# Verify rollback success
./scripts/health-check.sh production
./scripts/smoke-test.sh production
```

### Database Rollback (if needed)
```bash
# Restore database from pre-deployment backup
./scripts/restore-db-backup.sh pre-v1.2.0

# Run rollback migrations
sbt "runMain migrations.RollbackMigrations v1.1.5"
```

### Communication Protocol
1. **Immediate**: Update status page and monitoring
2. **15 minutes**: Internal team notification  
3. **30 minutes**: Stakeholder communication
4. **24 hours**: Post-mortem and remediation plan

## Release Documentation

### Changelog Format
```markdown
# Changelog

## [1.2.0] - 2024-02-15

### Added
- New delegation system for transaction signing
- Enhanced market commit validation
- Prometheus metrics integration

### Changed
- Improved fiber engine performance (30% faster)
- Updated bridge API for better error handling
- Simplified SDK initialization

### Deprecated
- Old authentication method (to be removed in v1.3.0)

### Removed
- Legacy state machine definitions

### Fixed
- Market commit timing race conditions
- Memory leak in ML0 layer
- Explorer pagination bug

### Security
- Fixed validation bypass in delegation system
```

### Migration Guides
Create migration guide for breaking changes:
```markdown
# Migration Guide: v1.1.x to v1.2.0

## Breaking Changes

### SDK Authentication
**Before:**
```javascript
const client = new OttoChainClient({
  apiKey: 'your-key'
});
```

**After:**
```javascript
const client = new OttoChainClient({
  auth: {
    type: 'session-key',
    key: 'your-session-key'
  }
});
```

## Monitoring and Metrics

### Release Health Metrics
- **Deployment Success Rate**: Target >95%
- **Rollback Rate**: Target <5%
- **Time to Deploy**: Target <30 minutes
- **Mean Time to Recovery**: Target <15 minutes

### Performance Benchmarks
- **Transaction Throughput**: >1000 TPS
- **API Response Time**: P95 <500ms
- **Memory Usage**: <8GB per node
- **CPU Usage**: <70% under normal load

## Automation

### GitHub Actions Workflows
- `.github/workflows/release.yml`: Automated release builds
- `.github/workflows/deploy.yml`: Environment deployments
- `.github/workflows/rollback.yml`: Emergency rollback

### Release Scripts
- `scripts/create-release.sh`: Automated release branch creation
- `scripts/validate-release.sh`: Pre-deployment validation
- `scripts/deploy-release.sh`: Production deployment
- `scripts/rollback-release.sh`: Emergency rollback

## Emergency Procedures

### Critical Bug in Production
1. **Assess Impact**: Determine severity and user impact
2. **Create Hotfix Branch**: `hotfix/critical-bug-fix`
3. **Implement Minimal Fix**: Smallest possible change
4. **Emergency Testing**: Critical path validation only
5. **Emergency Deployment**: Skip normal approval gates
6. **Monitor**: Watch for regression or side effects
7. **Post-Mortem**: Document and learn

### Failed Deployment
1. **Stop Deployment**: Prevent further damage
2. **Assess State**: What was deployed successfully?
3. **Choose Strategy**: Continue forward or rollback?
4. **Execute Plan**: Deploy fix or rollback
5. **Validate**: Ensure system stability
6. **Communicate**: Update stakeholders

---

**Responsible Teams:**
- **Engineering**: Technical implementation and validation
- **DevOps**: Infrastructure and deployment automation  
- **Product**: Business validation and release coordination
- **QA**: Testing and validation procedures