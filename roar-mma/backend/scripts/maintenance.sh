#!/bin/bash
# ROAR MMA System Maintenance Script
# Run daily for backups, health checks, and cleanup

set -e

# Configuration
BACKUP_DIR="/var/backups/roar-mma"
DB_PATH="../data/roarmma.db"
LOG_DIR="../logs"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d-%H%M%S)

echo "🔧 ROAR MMA System Maintenance"
echo "=============================="
echo "Started: $(date)"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# 1. Database Backup
echo "📦 Backing up database..."
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_DIR/roarmma-$DATE.db"
    echo "   ✅ Database backed up: roarmma-$DATE.db"

    # Get database size
    DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
    echo "   Database size: $DB_SIZE"
else
    echo "   ⚠️  Database not found at $DB_PATH"
fi

# 2. Clean old backups
echo ""
echo "🧹 Cleaning old backups (>$RETENTION_DAYS days)..."
DELETED=$(find "$BACKUP_DIR" -name "roarmma-*.db" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "   ✅ Deleted $DELETED old backup(s)"

# 3. Check disk space
echo ""
echo "💾 Checking disk space..."
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
echo "   Disk usage: $DISK_USAGE%"
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "   ⚠️  WARNING: Disk usage above 80%"
fi

# 4. Database integrity check
echo ""
echo "🔍 Checking database integrity..."
if command -v sqlite3 &> /dev/null; then
    INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>&1)
    if [ "$INTEGRITY" = "ok" ]; then
        echo "   ✅ Database integrity: OK"
    else
        echo "   ❌ Database integrity: FAILED"
        echo "   $INTEGRITY"
    fi
else
    echo "   ⚠️  sqlite3 not installed, skipping integrity check"
fi

# 5. Count records
echo ""
echo "📊 Database statistics..."
if command -v sqlite3 &> /dev/null; then
    MEMBERS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM members;" 2>/dev/null || echo "0")
    LEADS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM leads;" 2>/dev/null || echo "0")
    PRODUCTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM products;" 2>/dev/null || echo "0")
    CALLS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM phone_calls;" 2>/dev/null || echo "0")

    echo "   Members: $MEMBERS"
    echo "   Leads: $LEADS"
    echo "   Products: $PRODUCTS"
    echo "   Phone calls: $CALLS"
fi

# 6. Check log files
echo ""
echo "📝 Checking log files..."
if [ -d "$LOG_DIR" ]; then
    LOG_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
    LOG_COUNT=$(find "$LOG_DIR" -type f 2>/dev/null | wc -l)
    echo "   Log directory size: $LOG_SIZE"
    echo "   Log files: $LOG_COUNT"

    # Clean old logs (>7 days)
    find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null
    echo "   ✅ Cleaned logs older than 7 days"
else
    echo "   ⚠️  Log directory not found"
fi

# 7. Check if server is running
echo ""
echo "🔌 Checking server status..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "   ✅ Server is running"

    # Get uptime
    UPTIME=$(curl -s http://localhost:3001/api/health | grep -o '"uptime":[0-9.]*' | cut -d: -f2)
    if [ ! -z "$UPTIME" ]; then
        UPTIME_HOURS=$(echo "scale=2; $UPTIME / 3600" | bc)
        echo "   Uptime: ${UPTIME_HOURS}h"
    fi
else
    echo "   ❌ Server is not responding"
    echo "   Check if server is running: pm2 status"
fi

# 8. Check for low stock alerts
echo ""
echo "📦 Checking stock alerts..."
if command -v sqlite3 &> /dev/null; then
    ALERTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM stock_alerts WHERE status = 'active';" 2>/dev/null || echo "0")
    if [ "$ALERTS" -gt 0 ]; then
        echo "   ⚠️  $ALERTS active stock alert(s)"
        sqlite3 "$DB_PATH" "SELECT p.name, sa.current_quantity, sa.min_quantity FROM stock_alerts sa JOIN products p ON sa.product_id = p.id WHERE sa.status = 'active';" 2>/dev/null | while read line; do
            echo "      - $line"
        done
    else
        echo "   ✅ No stock alerts"
    fi
fi

# 9. Check for pending cancellation requests
echo ""
echo "🔔 Checking pending cancellation requests..."
if command -v sqlite3 &> /dev/null; then
    CANCELLATIONS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM cancellation_requests WHERE status = 'pending';" 2>/dev/null || echo "0")
    if [ "$CANCELLATIONS" -gt 0 ]; then
        echo "   ⚠️  $CANCELLATIONS pending cancellation request(s)"
    else
        echo "   ✅ No pending cancellation requests"
    fi
fi

# 10. Summary
echo ""
echo "=============================="
echo "✅ Maintenance complete"
echo "Finished: $(date)"
echo ""
echo "Backup location: $BACKUP_DIR/roarmma-$DATE.db"
echo ""

# Exit with appropriate code
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "⚠️  WARNING: Critical disk space"
    exit 1
fi

exit 0
