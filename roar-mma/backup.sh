#!/bin/bash

# ROAR MMA Backup Script
# Creates a backup of the database and important files

set -e

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
DB_PATH="./data/roarmma.db"

echo "Creating backup in $BACKUP_DIR..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_DIR/"
    echo "✓ Database backed up"
else
    echo "✗ Database not found at $DB_PATH"
fi

# Backup environment files
if [ -f "./backend/.env" ]; then
    cp "./backend/.env" "$BACKUP_DIR/backend.env"
    echo "✓ Backend environment backed up"
fi

if [ -f "./frontend/.env" ]; then
    cp "./frontend/.env" "$BACKUP_DIR/frontend.env"
    echo "✓ Frontend environment backed up"
fi

# Create archive
cd backups
tar -czf "$(basename $BACKUP_DIR).tar.gz" "$(basename $BACKUP_DIR)"
rm -rf "$(basename $BACKUP_DIR)"
cd ..

echo "✓ Backup completed: backups/$(basename $BACKUP_DIR).tar.gz"

# Keep only last 30 backups
cd backups
ls -t *.tar.gz | tail -n +31 | xargs -r rm
cd ..

echo "✓ Old backups cleaned up"
