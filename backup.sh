#!/bin/bash

# Backup script for SQLite database and uploads directory
# Usage: ./backup.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_FILE="./prisma/dev.db"
UPLOADS_DIR="./public/uploads"
BACKUP_DB="$BACKUP_DIR/db_$TIMESTAMP.sqlite3"
BACKUP_UPLOADS="$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting backup..."

# 1. Backup SQLite Database safely using sqlite3 online backup if available, or just copy if not
if command -v sqlite3 &> /dev/null; then
    sqlite3 "$DB_FILE" ".backup '$BACKUP_DB'"
else
    echo "Warning: sqlite3 CLI not found, performing a straight file copy."
    cp "$DB_FILE" "$BACKUP_DB"
fi

if [ -s "$BACKUP_DB" ]; then
    echo "✅ Database backed up to $BACKUP_DB"
else
    echo "❌ Error: Database backup file is empty or missing!"
    exit 1
fi

# 2. Backup Uploads Directory
if [ -d "$UPLOADS_DIR" ]; then
    tar -czf "$BACKUP_UPLOADS" "$UPLOADS_DIR"
    if [ -s "$BACKUP_UPLOADS" ]; then
        echo "✅ Uploads backed up to $BACKUP_UPLOADS"
    else
        echo "❌ Error: Uploads backup file is empty or missing!"
        exit 1
    fi
else
    echo "ℹ️  No uploads directory found to backup."
fi

echo "Backup complete!"
