#!/bin/bash

# Database Backup Script for Teaching LLM
# Usage: ./scripts/backup.sh [GITHUB_TOKEN] [GITHUB_REPO] [GITHUB_USER]

TOKEN=${1:-$GITHUB_TOKEN}
REPO=${2:-$GITHUB_BACKUP_REPO}
USER=${3:-$GITHUB_BACKUP_USER}

if [ -z "$TOKEN" ] || [ -z "$REPO" ] || [ -z "$USER" ]; then
  echo "Error: Missing required environment variables (GITHUB_TOKEN, GITHUB_BACKUP_REPO, GITHUB_BACKUP_USER)"
  exit 1
fi

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/dev_db_${TIMESTAMP}.db.gz"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Compress the database
echo "Compressing database..."
gzip -c prisma/dev.db > $BACKUP_FILE

if [ $? -ne 0 ]; then
  echo "Error: Compression failed"
  exit 1
fi

# Git operations
echo "Pushing backup to GitHub..."

# Temporary directory for git repo to avoid polluting main repo
TMP_GIT_DIR="/tmp/teaching_llm_backup_git"
rm -rf $TMP_GIT_DIR
mkdir -p $TMP_GIT_DIR

cd $TMP_GIT_DIR
git init
git config user.name "Backup Bot"
git config user.email "backup-bot@teaching-llm.com"

cp ../../$BACKUP_FILE .

git add .
git commit -m "Backup: ${TIMESTAMP}"

# Construct authenticated URL
# Format: https://<token>@github.com/<user>/<repo>.git
REMOTE_URL="https://${TOKEN}@github.com/${USER}/${REPO}.git"

git push -f $REMOTE_URL main:backups

if [ $? -eq 0 ]; then
  echo "Backup successfully pushed to GitHub"
  cd -
  # Optional: Cleanup local backup file if desired, or keep it
  # rm $BACKUP_FILE
else
  echo "Error: Git push failed"
  cd -
  exit 1
fi
