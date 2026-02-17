## 🚨 HOTFIX PR Template

### ⚠️ Emergency Information
**Severity Level:** P0 / P1 / P2  
**Issue Start Time:** YYYY-MM-DD HH:MM UTC
**Impact:** Brief description of user/system impact
**Business Impact:** Revenue/regulatory/reputation impact

**Related Incident:** #issue_number or incident tracking link

### 🔥 Problem Description
**What's Broken:**
Clear, concise description of the critical issue.

**Root Cause:**
Known or suspected cause of the issue.

**User Impact:**
- Number of affected users: X
- Affected functionality: List key features down
- Workaround available: Yes/No (describe if yes)

### ⚡ Hotfix Solution
**Change Summary:**
Brief description of the minimal fix being applied.

**Why This Approach:**
- Minimal risk change
- Fastest path to resolution  
- Addresses symptom/root cause
- Can be implemented safely under pressure

**Alternative Solutions Considered:**
- Option 1: Rejected because... 
- Option 2: Rejected because...

### 🧪 Emergency Testing
**Testing Completed:**
- [ ] Critical path functionality verified
- [ ] Targeted unit tests pass
- [ ] Integration test for affected area passes
- [ ] Manual verification of fix completed
- [ ] No obvious regression introduced

**Testing Skipped:**
- Full test suite (emergency situation)
- Performance testing (will monitor post-deploy)  
- Edge case testing (will address in follow-up)

**Test Evidence:**
```
# Test output or screenshots demonstrating fix works
```

### 🎯 Risk Assessment
**Change Risk:** Low / Medium / High
**Rollback Risk:** Low / Medium / High

**Risk Factors:**
- Change size: X lines of code
- Complexity: Low/Medium/High
- Areas affected: List modules/services
- Dependencies impacted: List if any

**Mitigation Strategies:**
- Immediate rollback plan ready
- Monitoring enhanced for affected areas
- Limited blast radius due to targeted fix

### 🔄 Rollback Plan
**Trigger Conditions:**
- New errors appear
- Performance degrades >X%
- Different functionality breaks

**Rollback Procedure:**
1. Execute emergency rollback script
2. Revert to previous JAR version
3. Monitor for 30 minutes
4. Confirm system stability

**Rollback Time:** Estimated X minutes

### 📊 Monitoring Plan
**Key Metrics to Watch:**
- [ ] Error rates in affected functionality
- [ ] Overall system error rates
- [ ] API response times
- [ ] Memory/CPU usage patterns
- [ ] User activity metrics

**Alert Thresholds:**
- Error rate >X% = immediate investigation
- Response time >Xms = performance degradation alert  
- Memory usage >X% = resource alert

**Monitoring Duration:** 24 hours intensive, then normal monitoring

### 🚀 Deployment Strategy
**Deployment Type:** Emergency hotfix deployment
**Approval Override:** Yes (emergency situation)
**Deployment Window:** Immediate upon approval

**Pre-Deployment:**
- [ ] Production backup completed
- [ ] Rollback artifacts prepared
- [ ] Monitoring dashboards open
- [ ] Communication channels notified

### 👥 Emergency Approval
**Primary Approver:** @scasplte2 (James)
**Emergency Override:** Can be deployed with single approval due to P0/P1 severity

**Approval Checklist:**
- [ ] Change is minimal and focused
- [ ] Risk is acceptable given severity
- [ ] Rollback plan is solid
- [ ] No obvious red flags

### 📢 Communication Plan
**Internal Updates:**
- [ ] Engineering team notified
- [ ] Incident command post updated
- [ ] Stakeholders informed of ETA

**External Updates:**
- [ ] Status page updated (if applicable)
- [ ] Customer communication prepared (if applicable)  

### 🔍 Post-Deployment Verification
**Immediate Checks (0-30 minutes):**
- [ ] All services responding
- [ ] Critical functionality working
- [ ] No new errors in logs
- [ ] Performance metrics stable

**Extended Monitoring (30 minutes - 4 hours):**
- [ ] User activity patterns normal
- [ ] Error rates remain low
- [ ] Performance within acceptable range
- [ ] No cascading failures

### 📝 Follow-up Actions Required
**Technical Debt Created:**
Brief description of any shortcuts taken that need proper fixes.

**Follow-up Issues to Create:**
- [ ] Proper fix for root cause (#TBD)
- [ ] Additional testing coverage (#TBD)
- [ ] Process improvements (#TBD)
- [ ] Monitoring enhancements (#TBD)

**Post-Mortem Required:** Yes / No
**Timeline for Proper Fix:** X days/weeks

### 🔗 Emergency Context
**Incident Timeline:**
- HH:MM - Issue first detected
- HH:MM - Incident declared  
- HH:MM - Hotfix development started
- HH:MM - Hotfix ready for deployment

**Key People Involved:**
- Incident Commander: @username
- Technical Lead: @username  
- Developer: @username

---

**⚠️ EMERGENCY DEPLOYMENT AUTHORIZATION**

By approving this PR, I confirm:
- [ ] The urgency justifies bypassing normal process
- [ ] The risk is acceptable given the severity
- [ ] I understand this creates technical debt
- [ ] A proper fix will be scheduled promptly

**Approver:** @username  
**Approval Time:** YYYY-MM-DD HH:MM UTC