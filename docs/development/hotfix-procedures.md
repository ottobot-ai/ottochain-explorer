# Hotfix Procedures - OttoChain Emergency Response

## Overview

This document provides detailed procedures for handling critical production issues requiring immediate fixes outside the normal release cycle. Hotfixes bypass standard development workflows to address security vulnerabilities, data integrity issues, or service outages.

## When to Use Hotfixes

### Critical Scenarios (P0/P1)
- **Security Vulnerabilities**: Exposed endpoints, data leaks, authentication bypass
- **Data Corruption**: Transaction validation failures, state inconsistencies
- **Service Outages**: Complete system down, critical API failures
- **Performance Degradation**: >80% performance drop, memory leaks causing crashes
- **Regulatory Issues**: Compliance violations requiring immediate remediation

### NOT Hotfix Scenarios
- Minor bugs that don't affect core functionality
- Feature requests or enhancements
- Performance optimizations (unless critical)
- Documentation fixes
- Style or formatting issues

## Escalation Matrix

### Severity Levels

#### P0 - Critical (Immediate Response)
**Impact**: Complete service outage or security breach
**Response Time**: 15 minutes
**Authorization**: Any senior developer can initiate
**Examples**: 
- All nodes down
- Authentication completely broken
- Active security exploit

#### P1 - High (Urgent Response) 
**Impact**: Major functionality broken, significant user impact
**Response Time**: 2 hours
**Authorization**: Lead developer or engineering manager
**Examples**:
- Transaction processing failures
- Bridge API returning 500 errors
- Data corruption affecting >10% of users

#### P2 - Medium (Planned Response)
**Impact**: Important functionality affected, workaround exists
**Response Time**: 24 hours
**Authorization**: Use normal release process
**Examples**:
- Single API endpoint failing
- UI display issues
- Performance degradation <50%

### Contact Information

**Primary On-Call**: @scasplte2 (James) - Telegram: @scasplte
**Secondary**: Engineering team via #emergency Slack channel
**Executive Escalation**: For regulatory/legal issues

## Hotfix Workflow

### Phase 1: Assessment (0-15 minutes)

#### Issue Validation
```bash
# Quick diagnostic commands
./scripts/health-check.sh production
./scripts/error-analysis.sh --last-hour
./scripts/performance-check.sh
```

#### Impact Assessment Template
```markdown
## Incident Report
**Time Detected**: 2024-02-15 14:30 UTC
**Reporter**: @username
**Severity**: P0/P1/P2
**Status**: Investigating/Confirmed/Mitigated

### Impact
- **Users Affected**: X users (Y% of total)
- **Services Down**: List affected services
- **Revenue Impact**: $X loss per hour (if applicable)
- **Regulatory Risk**: Yes/No (explain if yes)

### Root Cause (Initial Assessment)
Brief description of suspected cause

### Immediate Actions Taken
- [ ] Action 1
- [ ] Action 2

### Next Steps
1. Step 1 (ETA: X minutes)  
2. Step 2 (ETA: X minutes)
```

### Phase 2: Hotfix Development (15-60 minutes)

#### Create Hotfix Branch
```bash
# Start from production main branch
git checkout main
git pull origin main

# Create hotfix branch with descriptive name
git checkout -b hotfix/memory-leak-ml0-layer

# Optional: Create empty initial commit for tracking
git commit --allow-empty -m "hotfix: start emergency fix for ML0 memory leak"
git push -u origin hotfix/memory-leak-ml0-layer
```

#### Implement Minimal Fix
**Critical Guidelines:**
- Make the **smallest possible change** to resolve the issue
- Avoid refactoring or "while we're here" improvements
- Focus on symptom resolution first, root cause later
- Add comprehensive logging for monitoring

**Example: Memory Leak Fix**
```scala
// BEFORE (causing memory leak)
class StateManager {
  private val stateCache = mutable.Map[String, State]()
  
  def updateState(id: String, state: State): Unit = {
    stateCache(id) = state // Never cleaned up!
  }
}

// AFTER (hotfix)
class StateManager {
  private val stateCache = mutable.Map[String, State]()
  private val maxCacheSize = 1000 // Emergency limit
  
  def updateState(id: String, state: State): Unit = {
    // Emergency size limit to prevent OOM
    if (stateCache.size >= maxCacheSize) {
      stateCache.clear() // Crude but effective
      logger.warn(s"State cache cleared due to size limit: $maxCacheSize")
    }
    stateCache(id) = state
  }
}
```

#### Hotfix Testing
```bash
# Run targeted tests only (speed critical)
sbt "testOnly *StateManagerSpec"
sbt "testOnly *MemoryLeakSpec" 

# Quick integration test
sbt "it:testOnly *CriticalPathSpec"

# Manual validation
./scripts/test-hotfix-locally.sh
```

### Phase 3: Emergency Deployment (60-90 minutes)

#### Create Emergency PR
```bash
# Create PR with hotfix template
gh pr create \
  --title "🚨 HOTFIX: Fix ML0 memory leak causing OOM crashes" \
  --body "## Emergency Fix

**Severity**: P0 - Production Down
**Issue**: ML0 nodes crashing due to unbounded memory growth
**Fix**: Add emergency cache size limit to StateManager
**Testing**: Targeted tests pass, manual validation complete

### Risk Assessment
- **Change Size**: 5 lines
- **Complexity**: Low 
- **Test Coverage**: Critical paths validated
- **Rollback Plan**: Restart nodes with previous JAR

### Approval
Requesting emergency approval for production deployment.

Closes #emergency-issue-123" \
  --base main \
  --head hotfix/memory-leak-ml0-layer \
  --reviewer scasplte2 \
  --label hotfix,emergency
```

#### Expedited Review Process
**Review Checklist (5-10 minutes):**
- [ ] Change is minimal and focused
- [ ] No obvious side effects or regressions  
- [ ] Critical tests pass
- [ ] Rollback plan documented
- [ ] Change addresses root cause or symptom

**Emergency Override:**
For P0 issues, single approval sufficient with post-merge review commitment.

#### Build and Deploy
```bash
# Build hotfix JAR
sbt clean assembly

# Test JAR locally first
./scripts/validate-jar.sh target/scala-*/ottochain-assembly-*.jar

# Upload to releases
gh release create v1.1.6-hotfix1 \
  --title "🚨 Emergency Hotfix v1.1.6-hotfix1" \
  --notes "Emergency fix for ML0 memory leak" \
  --prerelease \
  target/scala-*/ottochain-assembly-*.jar

# Deploy to production (with monitoring)
cd ../ottochain-deploy
./deploy-emergency-hotfix.sh v1.1.6-hotfix1

# Monitor deployment
./scripts/deployment-monitor.sh --emergency
```

### Phase 4: Validation (90-120 minutes)

#### Immediate Health Checks
```bash
# Verify all services responding
./scripts/health-check.sh production --verbose

# Check error rates
./scripts/error-analysis.sh --last-30min

# Performance validation  
./scripts/performance-check.sh --compare-baseline

# Memory usage validation
./scripts/memory-check.sh --trend-analysis
```

#### User Impact Validation
- [ ] Critical user journeys working
- [ ] API endpoints responding correctly
- [ ] Transaction processing resumed
- [ ] No new errors introduced

#### Monitoring Setup
```bash
# Add temporary monitoring for hotfix
./scripts/add-hotfix-monitoring.sh \
  --metric "jvm.memory.heap.used" \
  --alert-threshold "6GB" \
  --notification-channel "#emergency"
```

### Phase 5: Communication (Ongoing)

#### Status Updates Template
```markdown
## 🚨 INCIDENT UPDATE - [TIMESTAMP]

**Status**: [INVESTIGATING/MITIGATING/RESOLVED]
**Affected Systems**: [List systems]
**Impact**: [Brief description]

### What Happened
Brief explanation of the issue

### What We're Doing
Current mitigation efforts

### Expected Resolution
ETA for full resolution

### How We'll Prevent This
Brief prevention plan (full post-mortem to follow)

---
Next update in 30 minutes or upon significant change.
```

#### Communication Channels
1. **Status Page**: Update immediately
2. **Internal Slack**: #emergency channel
3. **External**: Customer communication if needed
4. **Regulatory**: If compliance implications

### Phase 6: Post-Hotfix Activities (24-48 hours)

#### Merge Back to Develop
```bash
# Ensure hotfix is in develop branch
git checkout develop  
git pull origin develop
git merge main --no-ff -m "hotfix: merge emergency ML0 memory fix"
git push origin develop
```

#### Proper Fix Planning
```markdown
## Technical Debt: Emergency Hotfix Follow-up

**Hotfix**: v1.1.6-hotfix1 (ML0 memory leak)
**Emergency Fix**: Added crude cache size limit
**Proper Solution Needed**: Implement LRU cache with smart eviction

### Follow-up Tasks
- [ ] Implement proper LRU cache (Issue #456)
- [ ] Add memory pressure monitoring (Issue #457)  
- [ ] Performance testing with realistic load (Issue #458)
- [ ] Update architecture docs (Issue #459)

**Target**: Include in next minor release v1.2.0
**Priority**: High (P1)
```

#### Post-Mortem Analysis
```markdown
## Post-Mortem: ML0 Memory Leak Incident

**Date**: 2024-02-15
**Duration**: 2.5 hours (14:30 - 17:00 UTC)
**Severity**: P0 (Complete service outage)

### Timeline
- 14:30 - First alerts for high memory usage
- 14:45 - Node crashes begin
- 15:00 - Incident declared, hotfix started
- 16:00 - Hotfix deployed
- 16:30 - Service fully restored
- 17:00 - Monitoring confirmed stable

### Root Cause
Unbounded memory growth in StateManager cache due to missing cleanup logic.

### What Went Well
- Quick detection via monitoring
- Rapid hotfix development (30 minutes)
- Clean emergency deployment process
- Effective communication

### What Could Improve
- Earlier detection (memory growth was gradual)
- Better cache management patterns
- Automated emergency deployment
- Performance testing should catch this

### Action Items
- [ ] Implement memory pressure testing in CI
- [ ] Add cache management guidelines to development docs
- [ ] Create automated memory leak detection
- [ ] Review all other unbounded collections

**Preventable**: Yes, with better testing and architectural patterns
```

## Emergency Scripts and Tools

### Health Check Script
```bash
#!/bin/bash
# scripts/emergency-health-check.sh

echo "🚨 EMERGENCY HEALTH CHECK - $(date)"
echo "=================================="

# Quick service checks
echo "🔍 Service Status:"
curl -s http://bridge.ottochain.ai/health || echo "❌ Bridge DOWN"
curl -s http://indexer.ottochain.ai/health || echo "❌ Indexer DOWN"
curl -s http://explorer.ottochain.ai/health || echo "❌ Explorer DOWN"

# Memory usage
echo -e "\n💾 Memory Usage:"
ssh node1 'free -h | head -2'
ssh node2 'free -h | head -2'  
ssh node3 'free -h | head -2'

# Error rates
echo -e "\n⚠️ Recent Errors:"
tail -n 50 /var/log/ottochain/errors.log | grep "$(date '+%Y-%m-%d %H')" | wc -l

# Performance check  
echo -e "\n⚡ API Response Times:"
time curl -s http://bridge.ottochain.ai/api/fibers > /dev/null

echo -e "\n✅ Health check complete"
```

### Emergency Rollback Script
```bash
#!/bin/bash
# scripts/emergency-rollback.sh

PREVIOUS_VERSION=${1:-"v1.1.5"}

echo "🔄 EMERGENCY ROLLBACK to $PREVIOUS_VERSION"
echo "========================================="

# Stop current services
echo "Stopping current services..."
docker-compose down

# Fetch previous version
echo "Downloading $PREVIOUS_VERSION..."
wget "https://github.com/ottobot-ai/ottochain/releases/download/$PREVIOUS_VERSION/ottochain-assembly.jar" \
  -O /opt/ottochain/ottochain-assembly.jar

# Restart with previous version
echo "Starting services with $PREVIOUS_VERSION..."
docker-compose up -d

# Wait and verify
sleep 30
./scripts/health-check.sh production

echo "✅ Rollback complete"
```

## Monitoring and Alerting

### Emergency Alert Thresholds
```yaml
# monitoring/emergency-alerts.yml
alerts:
  memory_usage:
    threshold: 85%
    severity: P1
    
  heap_memory:
    threshold: 7GB
    severity: P0
    
  error_rate:
    threshold: 5%
    severity: P1
    
  response_time:
    threshold: 5000ms
    severity: P1
    
  service_down:
    threshold: 1 failed health check
    severity: P0
```

### On-Call Rotation
```markdown
## Emergency Response Team

### Primary On-Call (24/7)
- **Week 1-2**: @scasplte2
- **Week 3-4**: @engineer2 (when available)

### Escalation Path
1. **Technical Lead**: @scasplte2 (always)
2. **Engineering Manager**: [TBD] 
3. **Executive**: [TBD for regulatory issues]

### Response SLAs
- **P0**: 15 minutes acknowledgment, 2 hours resolution
- **P1**: 2 hours acknowledgment, 8 hours resolution  
- **P2**: Next business day
```

---

**Emergency Contact**: @scasplte2 on Telegram (@scasplte) - Available 24/7 for P0 incidents

**Remember**: In true emergencies, act first and document later. This process serves as a guide, not a rigid rulebook.