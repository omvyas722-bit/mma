#!/bin/bash

# ROAR MMA Restore Script
# Restores a backup of the database

set -eu

SCRIPT_DIR=$(dirname "$0")
DATA_DIR="$SCRIPT_DIR/data"
BACKUPS_DIR="$SCRIPT_DIR/backups"
FORCE="${FORCE:-false}"

if [ -z "${1:-}" ]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -1 "$BACKUPS_DIR"/*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Backup file validation
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

if [[ "$BACKUP_FILE" != *.tar.gz && "$BACKUP_FILE" != *.tgz ]]; then
    echo "Error: Backup file must have .tar.gz or .tgz extension"
    exit 1
fi

if [ ! -s "$BACKUP_FILE" ]; then
    echo "Error: Backup file is empty (zero size)"
    exit 1
fi

echo "=================================="
echo "ROAR MMA Restore Script"
echo "=================================="
echo "Backup file: $BACKUP_FILE"
echo ""

# Confirm (skip for non-interactive or --force)
if [ "$FORCE" != "true" ] && [ -t 0 ]; then
    read -p "This will overwrite the current database. Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Restore cancelled"
        exit 1
    fi
elif [ "$FORCE" != "true" ]; then
    echo "Non-interactive shell and FORCE not set. Use FORCE=true to skip confirmation."
    echo "Restore cancelled"
    exit 1
fi

# Pre-restore backup of current DB
if [ -f "$DATA_DIR/roarmma.db" ]; then
    PRE_RESTORE_BACKUP="$BACKUPS_DIR/pre-restore-$(date +%Y%m%d_%H%M%S).db"
    cp "$DATA_DIR/roarmma.db" "$PRE_RESTORE_BACKUP"
    echo "✓ Pre-restore backup saved: $PRE_RESTORE_BACKUP"
fi

# Stop services (cd to compose dir first)
cd "$SCRIPT_DIR"
docker compose down

# Check available space before extracting
BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
# Convert backup size to KB for consistent comparison with df output
BACKUP_SIZE_KB=$(( (BACKUP_SIZE + 1023) / 1024 ))
AVAILABLE_SPACE=$(df --output=avail "$DATA_DIR" 2>/dev/null | tail -1 || df -k "$DATA_DIR" 2>/dev/null | tail -1 | awk '{print $4}')
if [ -n "$AVAILABLE_SPACE" ] && [ "$AVAILABLE_SPACE" -lt "$BACKUP_SIZE_KB" ] 2>/dev/null; then
    echo "✗ Insufficient disk space. Available: ${AVAILABLE_SPACE}KB, Required: ${BACKUP_SIZE_KB}KB"
    exit 1
fi

# Extract backup
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Verify tar extraction succeeded
if [ $? -ne 0 ]; then
    echo "✗ Failed to extract backup archive"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Restore database (use -print0 for whitespace-safe file handling)
BACKUP_DB=$(find "$TEMP_DIR" -name "roarmma.db" -print0 | tr '\0' '\n' | head -1)
if [ -f "$BACKUP_DB" ]; then
    # Handle multiple matches by taking the most recent one
    MATCH_COUNT=$(find "$TEMP_DIR" -name "roarmma.db" | wc -l)
    if [ "$MATCH_COUNT" -gt 1 ]; then
        echo "ℹ Multiple database files found in backup. Using the first match."
    fi
    cp "$BACKUP_DB" "$DATA_DIR/roarmma.db"
    echo "✓ Database restored"
    # Integrity check via hash verification
    if command -v sha256sum &>/dev/null; then
        BACKUP_HASH=$(sha256sum "$BACKUP_DB" | cut -d' ' -f1)
        RESTORE_HASH=$(sha256sum "$DATA_DIR/roarmma.db" | cut -d' ' -f1)
        if [ "$BACKUP_HASH" = "$RESTORE_HASH" ]; then
            echo "✓ Integrity check passed (SHA256 match)"
        else
            echo "✗ Integrity check failed: hash mismatch"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
    else
        echo "⚠ sha256sum not available. Skipping integrity verification."
    fi
else
    echo "✗ Database not found in backup"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Cleanup
rm -rf "$TEMP_DIR"

# Restart services
echo "Starting services..."
docker compose up -d

echo ""
echo "=================================="
echo "Restore completed successfully!"
echo "=================================="
