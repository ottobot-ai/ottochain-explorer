#!/bin/bash
# Branch Migration Script for OttoChain GitFlow Transition
# This script helps safely migrate existing development branches to new GitFlow naming conventions

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
FORCE=false
BACKUP_PREFIX="backup-$(date +%Y%m%d)"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    cat << EOF
Branch Migration Script - OttoChain GitFlow Transition

USAGE:
    ./scripts/branch-migration.sh [OPTIONS] [COMMAND]

COMMANDS:
    audit       - Analyze existing branches and show migration plan
    migrate     - Execute branch migration to new naming conventions
    cleanup     - Clean up old branches after successful migration
    rollback    - Rollback migration using backup branches

OPTIONS:
    --dry-run   - Show what would be done without making changes
    --force     - Force migration even with uncommitted changes
    --help      - Show this help message

EXAMPLES:
    ./scripts/branch-migration.sh audit
    ./scripts/branch-migration.sh migrate --dry-run
    ./scripts/branch-migration.sh migrate
    ./scripts/branch-migration.sh cleanup

MIGRATION RULES:
    feature/xyz     -> feat/xyz
    bugfix/xyz      -> fix/xyz  
    dev-*           -> feat/*
    *-dev           -> feat/*
    experimental-*  -> feat/experimental-*
    user/*          -> feat/user-*

EOF
}

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository. Please run from the root of an OttoChain repository."
        exit 1
    fi
}

# Check for uncommitted changes
check_clean_working_tree() {
    if ! git diff-index --quiet HEAD --; then
        if [ "$FORCE" = false ]; then
            log_error "You have uncommitted changes. Please commit or stash them first."
            log_info "Use --force to override this check (not recommended)."
            exit 1
        else
            log_warning "Proceeding with uncommitted changes due to --force flag."
        fi
    fi
}

# Fetch latest from origin
update_from_origin() {
    log_info "Fetching latest changes from origin..."
    git fetch origin --prune
    log_success "Updated from origin"
}

# Create backup of all local branches
create_backups() {
    log_info "Creating backup branches..."
    
    # Get all local branches except main and develop
    local branches=($(git branch --format='%(refname:short)' | grep -v '^main$' | grep -v '^develop$'))
    
    for branch in "${branches[@]}"; do
        backup_name="${BACKUP_PREFIX}-${branch}"
        
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Would create backup: $backup_name"
        else
            git branch "$backup_name" "$branch"
            log_success "Created backup: $backup_name"
        fi
    done
}

# Analyze existing branches
audit_branches() {
    log_info "Auditing existing branches..."
    echo
    
    # Get all local branches
    local branches=($(git branch --format='%(refname:short)' | grep -v '^main$' | grep -v '^develop$'))
    
    if [ ${#branches[@]} -eq 0 ]; then
        log_info "No branches need migration."
        return 0
    fi
    
    echo "MIGRATION PLAN:"
    echo "==============="
    
    local needs_migration=()
    local already_compliant=()
    local unknown_pattern=()
    
    for branch in "${branches[@]}"; do
        case "$branch" in
            feat/*)
                already_compliant+=("$branch")
                ;;
            fix/*)
                already_compliant+=("$branch")
                ;;
            hotfix/*)
                already_compliant+=("$branch")
                ;;
            release/*)
                already_compliant+=("$branch")
                ;;
            feature/*)
                new_name=$(echo "$branch" | sed 's/^feature\//feat\//')
                needs_migration+=("$branch -> $new_name")
                ;;
            bugfix/*)
                new_name=$(echo "$branch" | sed 's/^bugfix\//fix\//')
                needs_migration+=("$branch -> $new_name")
                ;;
            dev-*)
                new_name=$(echo "$branch" | sed 's/^dev-/feat\//')
                needs_migration+=("$branch -> $new_name")
                ;;
            *-dev)
                new_name=$(echo "$branch" | sed 's/-dev$//' | sed 's/^/feat\//')
                needs_migration+=("$branch -> $new_name")
                ;;
            experimental-*)
                new_name=$(echo "$branch" | sed 's/^experimental-/feat\/experimental-/')
                needs_migration+=("$branch -> $new_name")
                ;;
            user/*)
                new_name=$(echo "$branch" | sed 's/^user\//feat\/user-/')
                needs_migration+=("$branch -> $new_name")
                ;;
            backup-*)
                # Skip backup branches
                ;;
            *)
                unknown_pattern+=("$branch")
                ;;
        esac
    done
    
    # Show results
    if [ ${#already_compliant[@]} -gt 0 ]; then
        echo -e "${GREEN}✅ Already GitFlow compliant:${NC}"
        for branch in "${already_compliant[@]}"; do
            echo "   $branch"
        done
        echo
    fi
    
    if [ ${#needs_migration[@]} -gt 0 ]; then
        echo -e "${YELLOW}🔄 Need migration:${NC}"
        for migration in "${needs_migration[@]}"; do
            echo "   $migration"
        done
        echo
    fi
    
    if [ ${#unknown_pattern[@]} -gt 0 ]; then
        echo -e "${RED}❓ Unknown pattern (manual review needed):${NC}"
        for branch in "${unknown_pattern[@]}"; do
            echo "   $branch"
        done
        echo
    fi
    
    echo "SUMMARY:"
    echo "  Compliant branches: ${#already_compliant[@]}"
    echo "  Branches to migrate: ${#needs_migration[@]}"
    echo "  Manual review needed: ${#unknown_pattern[@]}"
    echo
    
    if [ ${#needs_migration[@]} -gt 0 ]; then
        echo "Run './scripts/branch-migration.sh migrate' to execute the migration."
    else
        echo "No automatic migration needed."
    fi
}

# Get new branch name based on old name
get_new_branch_name() {
    local old_name="$1"
    
    case "$old_name" in
        feature/*)
            echo "$old_name" | sed 's/^feature\//feat\//'
            ;;
        bugfix/*)
            echo "$old_name" | sed 's/^bugfix\//fix\//'
            ;;
        dev-*)
            echo "$old_name" | sed 's/^dev-/feat\//'
            ;;
        *-dev)
            echo "$old_name" | sed 's/-dev$//' | sed 's/^/feat\//'
            ;;
        experimental-*)
            echo "$old_name" | sed 's/^experimental-/feat\/experimental-/'
            ;;
        user/*)
            echo "$old_name" | sed 's/^user\//feat\/user-/'
            ;;
        *)
            echo ""  # No migration needed or unknown pattern
            ;;
    esac
}

# Migrate a single branch
migrate_branch() {
    local old_name="$1"
    local new_name="$2"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would migrate: $old_name -> $new_name"
        return 0
    fi
    
    # Check if new branch name already exists
    if git show-ref --verify --quiet refs/heads/"$new_name"; then
        log_warning "Branch $new_name already exists, skipping migration of $old_name"
        return 1
    fi
    
    # Create new branch from old branch
    git branch "$new_name" "$old_name"
    
    # If there's a remote branch, update the upstream
    if git show-ref --verify --quiet refs/remotes/origin/"$old_name"; then
        log_info "Pushing new branch to origin: $new_name"
        git push origin "$new_name"
        
        # Set upstream tracking
        git branch --set-upstream-to=origin/"$new_name" "$new_name"
    fi
    
    log_success "Migrated: $old_name -> $new_name"
}

# Execute branch migration
execute_migration() {
    log_info "Starting branch migration..."
    
    # Create backups first
    create_backups
    
    # Get all local branches that need migration
    local branches=($(git branch --format='%(refname:short)' | grep -v '^main$' | grep -v '^develop$' | grep -v '^backup-'))
    
    local migration_count=0
    local skip_count=0
    
    for branch in "${branches[@]}"; do
        new_name=$(get_new_branch_name "$branch")
        
        if [ -n "$new_name" ] && [ "$new_name" != "$branch" ]; then
            if migrate_branch "$branch" "$new_name"; then
                ((migration_count++))
            else
                ((skip_count++))
            fi
        fi
    done
    
    echo
    log_success "Migration completed!"
    echo "  Branches migrated: $migration_count"
    echo "  Branches skipped: $skip_count"
    echo
    
    if [ "$DRY_RUN" = false ]; then
        log_info "Next steps:"
        echo "1. Review the new branch names"
        echo "2. Update any open PRs to use new branch names"  
        echo "3. Run './scripts/branch-migration.sh cleanup' to remove old branches"
        echo "4. Notify team members about the new branch naming"
    fi
}

# Clean up old branches after migration
cleanup_old_branches() {
    log_info "Cleaning up old branches..."
    
    # Get branches that have backups (indicating they were migrated)
    local backup_branches=($(git branch --format='%(refname:short)' | grep "^${BACKUP_PREFIX}-"))
    
    for backup_branch in "${backup_branches[@]}"; do
        # Extract original branch name
        original_branch=$(echo "$backup_branch" | sed "s/^${BACKUP_PREFIX}-//")
        
        # Check if original branch still exists and if new branch exists
        if git show-ref --verify --quiet refs/heads/"$original_branch"; then
            new_name=$(get_new_branch_name "$original_branch")
            
            if [ -n "$new_name" ] && git show-ref --verify --quiet refs/heads/"$new_name"; then
                if [ "$DRY_RUN" = true ]; then
                    log_info "[DRY RUN] Would delete old branch: $original_branch"
                else
                    # Delete local branch
                    git branch -D "$original_branch"
                    
                    # Delete remote branch if it exists
                    if git show-ref --verify --quiet refs/remotes/origin/"$original_branch"; then
                        git push origin --delete "$original_branch" 2>/dev/null || true
                    fi
                    
                    log_success "Deleted old branch: $original_branch"
                fi
            fi
        fi
    done
}

# Rollback migration using backups
rollback_migration() {
    log_warning "Rolling back migration..."
    
    # Get backup branches
    local backup_branches=($(git branch --format='%(refname:short)' | grep "^${BACKUP_PREFIX}-"))
    
    if [ ${#backup_branches[@]} -eq 0 ]; then
        log_error "No backup branches found with prefix: $BACKUP_PREFIX"
        exit 1
    fi
    
    for backup_branch in "${backup_branches[@]}"; do
        # Extract original branch name
        original_branch=$(echo "$backup_branch" | sed "s/^${BACKUP_PREFIX}-//")
        new_branch=$(get_new_branch_name "$original_branch")
        
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Would restore: $backup_branch -> $original_branch"
            if [ -n "$new_branch" ]; then
                log_info "[DRY RUN] Would delete: $new_branch"
            fi
        else
            # Restore original branch from backup
            git branch -f "$original_branch" "$backup_branch"
            
            # Delete new branch if it exists
            if [ -n "$new_branch" ] && git show-ref --verify --quiet refs/heads/"$new_branch"; then
                git branch -D "$new_branch"
                
                # Delete remote new branch
                if git show-ref --verify --quiet refs/remotes/origin/"$new_branch"; then
                    git push origin --delete "$new_branch" 2>/dev/null || true
                fi
            fi
            
            # Delete backup branch
            git branch -D "$backup_branch"
            
            log_success "Rolled back: $original_branch"
        fi
    done
}

# Main script logic
main() {
    check_git_repo
    
    case "${1:-audit}" in
        audit)
            update_from_origin
            audit_branches
            ;;
        migrate)
            check_clean_working_tree
            update_from_origin
            execute_migration
            ;;
        cleanup)
            cleanup_old_branches
            ;;
        rollback)
            rollback_migration
            ;;
        --help|help)
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            echo
            show_help
            exit 1
            ;;
    esac
}

# Parse command line options
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            COMMAND="$1"
            shift
            ;;
    esac
done

# Run main function with remaining arguments
main "$COMMAND"