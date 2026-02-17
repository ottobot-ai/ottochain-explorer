## Release PR Template

### 🚀 Release Information
**Version:** v1.x.x
**Release Date:** YYYY-MM-DD
**Release Type:** Major / Minor / Patch

### 📋 Release Checklist

#### Pre-Release Validation
- [ ] All planned features implemented and tested
- [ ] Version number updated in all relevant files
- [ ] Changelog updated with all changes
- [ ] Breaking changes documented
- [ ] Migration guide created (if applicable)
- [ ] Performance benchmarks run and acceptable

#### Testing & Quality Assurance  
- [ ] Full test suite passes (`sbt test`)
- [ ] Integration tests pass (`sbt it:test`)
- [ ] End-to-end tests pass
- [ ] Load testing completed (if significant changes)
- [ ] Security scan completed
- [ ] Code coverage ≥70%

#### Documentation
- [ ] API documentation updated
- [ ] User documentation updated  
- [ ] Developer documentation updated
- [ ] README updated with new features
- [ ] Installation/upgrade instructions updated

#### Environment Testing
- [ ] Deployed and tested in development environment
- [ ] Deployed and tested in staging environment
- [ ] Staging deployment matches production configuration
- [ ] Performance testing in staging completed
- [ ] Database migrations tested (if applicable)

#### Cross-Repository Coordination
- [ ] SDK version compatibility verified
- [ ] Services integration tested
- [ ] Explorer compatibility confirmed
- [ ] Deploy scripts updated

### 📖 What's Included in This Release

#### ✨ New Features
- Feature 1: Brief description with issue link
- Feature 2: Brief description with issue link

#### 🐛 Bug Fixes
- Fix 1: Brief description with issue link  
- Fix 2: Brief description with issue link

#### 🔧 Improvements
- Improvement 1: Brief description
- Improvement 2: Brief description

#### ⚠️ Breaking Changes
- Breaking change 1: Description and migration path
- Breaking change 2: Description and migration path

#### 🗑️ Deprecations
- Deprecated feature 1: Will be removed in version X.X.X
- Deprecated feature 2: Will be removed in version X.X.X

### 📊 Performance Impact
- Memory usage change: ±X%
- CPU usage change: ±X%  
- Transaction throughput change: ±X%
- API response time change: ±X%

**Benchmarking Details:**
Include relevant performance test results and comparisons.

### 🔒 Security Considerations
- [ ] No new security vulnerabilities introduced
- [ ] Security scan results reviewed
- [ ] Dependencies updated to latest secure versions
- [ ] Any security fixes included in this release

### 📦 Database Changes
- [ ] No database migrations required
- [ ] Database migrations included and tested
- [ ] Migration rollback procedures documented

**Migration Details:**
If database changes are included, describe them here.

### 🚨 Rollback Plan
**Previous Stable Version:** v1.x.x  
**Rollback Procedure:**
1. Stop current deployment
2. Deploy previous version JAR
3. Run rollback migrations (if applicable)
4. Verify system health

**Rollback Testing:**
- [ ] Rollback procedure tested in staging
- [ ] Database rollback tested
- [ ] Service rollback verified

### 🌍 Deployment Strategy
- [ ] Blue-green deployment planned
- [ ] Canary deployment configured  
- [ ] Rolling deployment acceptable
- [ ] Maintenance window required

**Deployment Notes:**
Any special deployment considerations or requirements.

### 👥 Stakeholder Approval
- [ ] Technical review completed (@reviewer1)
- [ ] Business validation completed (@product-owner)
- [ ] Security review completed (if applicable)
- [ ] Performance review completed (if applicable)

### 📈 Release Metrics
Post-deployment success criteria:
- [ ] All health checks passing
- [ ] Error rate <1%
- [ ] Response time <500ms (P95)
- [ ] Memory usage stable
- [ ] No user-reported issues

### 🔗 Related Links
- [Changelog](CHANGELOG.md)
- [Migration Guide](docs/migration/v1.x.x.md) (if applicable)
- [Performance Benchmarks](docs/performance/v1.x.x-benchmarks.md)
- [Security Scan Results](docs/security/v1.x.x-scan.md)

### 📞 Emergency Contacts
**Primary:** @scasplte2 (James)  
**Secondary:** Engineering team #emergency channel

---

**Post-Release Actions:**
- [ ] Monitor deployment for 24 hours
- [ ] Update project documentation
- [ ] Merge release branch back to develop
- [ ] Plan next release cycle
- [ ] Conduct release retrospective