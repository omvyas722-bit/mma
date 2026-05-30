#!/bin/bash

# ROAR MMA Backup Script
# Creates a backup of the database and important files

set -eu

SCRIPT_DIR=$(dirname "$0")
TIMESTAMP=$(date +%Y%m%d_%H%M%S_%N)  # %N adds nanosecond collision protection
BACKUP_DIR="$SCRIPT_DIR/backups/$TIMESTAMP"
DB_PATH="$SCRIPT_DIR/data/roarmma.db"
BACKUPS_DIR="$SCRIPT_DIR/backups"

echo "Creating backup in $BACKUP_DIR..."

# Pre-backup check for DB file existence
if [ ! -f "$DB_PATH" ]; then
    echo "✗ Database not found at $DB_PATH. Aborting."
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
cp "$DB_PATH" "$BACKUP_DIR/"
echo "✓ Database backed up"

# Backup environment files
if [ -f "$SCRIPT_DIR/backend/.env" ]; then
    cp "$SCRIPT_DIR/backend/.env" "$BACKUP_DIR/backend.env"
    echo "✓ Backend environment backed up"
fi

if [ -f "$SCRIPT_DIR/frontend/.env" ]; then
    cp "$SCRIPT_DIR/frontend/.env" "$BACKUP_DIR/frontend.env"
    echo "✓ Frontend environment backed up"
fi

# Include root .env in backup
if [ -f "$SCRIPT_DIR/.env" ]; then
    cp "$SCRIPT_DIR/.env" "$BACKUP_DIR/root.env"
    echo "✓ Root environment backed up"
fi

# Create archive
ARCHIVE_NAME="$TIMESTAMP.tar.gz"
tar -czf "$BACKUPS_DIR/$ARCHIVE_NAME" -C "$SCRIPT_DIR/backups" "$TIMESTAMP"

# Verify tar succeeded before deleting original
if [ $? -eq 0 ]; then
    rm -rf "$BACKUP_DIR"
    echo "✓ Backup completed: $BACKUPS_DIR/$ARCHIVE_NAME"
else
    echo "✗ Backup archive creation failed. Preserving uncompressed backup at $BACKUP_DIR"
    exit 1
fi

# Encryption option (pass ENCRYPT_PASSWORD env var to enable)
if [ -n "${ENCRYPT_PASSWORD:-}" ]; then
    if command -v gpg &>/dev/null; then
        PASS_FILE=$(mktemp)
        echo -n "$ENCRYPT_PASSWORD" > "$PASS_FILE"
        gpg --batch --yes --passphrase-file "$PASS_FILE" -c "$BACKUPS_DIR/$ARCHIVE_NAME"
        rm -f "$PASS_FILE"
        rm -f "$BACKUPS_DIR/$ARCHIVE_NAME"
        echo "✓ Backup encrypted: $BACKUPS_DIR/$ARCHIVE_NAME.gpg"
    else
        echo "⚠ gpg not available. Skipping encryption."
    fi
fi

# Keep only last 30 backups (handle both encrypted and unencrypted safely)
if [ -n "${ENCRYPT_PASSWORD:-}" ] && command -v gpg &>/dev/null; then
    # Only encrypted files exist (unencrypted was deleted)
    ls -t "$BACKUPS_DIR"/*.tar.gz.gpg 2>/dev/null | tail -n +31 | while IFS= read -r f; do rm -f "$f"; done
else
    # Only unencrypted files
    ls -t "$BACKUPS_DIR"/*.tar.gz 2>/dev/null | tail -n +31 | while IFS= read -r f; do rm -f "$f"; done
fi

echo "✓ Old backups cleaned up"
