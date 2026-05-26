#!/bin/bash

# ROAR MMA Restore Script
# Restores a backup of the database

set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup-file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -1 ./backups/*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "=================================="
echo "ROAR MMA Restore Script"
echo "=================================="
echo "Backup file: $BACKUP_FILE"
echo ""

# Confirm
read -p "This will overwrite the current database. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled"
    exit 1
fi

# Stop services
echo "Stopping services..."
docker-compose down

# Extract backup
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Restore database
BACKUP_DB=$(find "$TEMP_DIR" -name "roarmma.db" | head -1)
if [ -f "$BACKUP_DB" ]; then
    cp "$BACKUP_DB" "./data/roarmma.db"
    echo "✓ Database restored"
else
    echo "✗ Database not found in backup"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Cleanup
rm -rf "$TEMP_DIR"

# Restart services
echo "Starting services..."
docker-compose up -d

echo ""
echo "=================================="
echo "Restore completed successfully!"
echo "=================================="
