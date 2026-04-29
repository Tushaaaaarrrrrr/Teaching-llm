#!/usr/bin/env node

/**
 * Supabase Database Backup Script (Free Plan)
 * No upgrades required - exports directly via PostgreSQL
 * 
 * Usage: node backup-supabase.js
 * 
 * First, get your DATABASE_URL from Supabase:
 * Dashboard → Settings → Database → Connection pooling (URI)
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve)
  })
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗')
  console.log('║   SUPABASE FREE PLAN BACKUP                       ║')
  console.log('║   No upgrade needed!                              ║')
  console.log('╚═══════════════════════════════════════════════════╝\n')

  // Get DATABASE_URL
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.log('📋 Getting your Supabase database URL:\n')
    console.log('   1. Go to: https://supabase.com/dashboard/project/_/settings/database')
    console.log('   2. Click "Connection pooling" tab')
    console.log('   3. Copy the "URI" (looks like: postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres)')
    console.log('   4. Paste it below:\n')

    const url = await question('📍 DATABASE_URL: ')
    if (!url.startsWith('postgresql://')) {
      console.log('❌ Invalid URL! Must start with postgresql://')
      process.exit(1)
    }

    process.env.DATABASE_URL = url
  }

  const timestamp = new Date().toISOString().split('T')[0]
  const backupFile = `backup_${timestamp}_${Date.now()}.sql`

  console.log(`\n🔄 Backing up your Supabase database...`)
  console.log(`📦 Output file: ${backupFile}\n`)

  try {
    // Check if pg_dump is installed
    try {
      execSync('which pg_dump', { stdio: 'ignore' })
    } catch {
      console.log('❌ ERROR: pg_dump not found on your system')
      console.log('\n   Install PostgreSQL tools:')
      console.log('   macOS:  brew install postgresql@15')
      console.log('   Linux:  sudo apt install postgresql-client')
      console.log('   Windows: https://www.postgresql.org/download/windows/')
      process.exit(1)
    }

    // Run pg_dump
    execSync(
      `pg_dump "${process.env.DATABASE_URL}" > "${backupFile}"`,
      { stdio: 'inherit' }
    )

    // Verify backup
    if (!fs.existsSync(backupFile)) {
      throw new Error('Backup file not created')
    }

    const stats = fs.statSync(backupFile)
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2)

    console.log(`\n╔═══════════════════════════════════════════════════╗`)
    console.log(`║   ✅ BACKUP SUCCESSFUL!                          ║`)
    console.log(`╚═══════════════════════════════════════════════════╝\n`)
    console.log(`✅ Backup file: ${backupFile}`)
    console.log(`📊 Size: ${sizeInMB} MB`)
    console.log(`📅 Location: ${path.resolve(backupFile)}\n`)

    console.log('💡 Next steps:')
    console.log('   1. Keep this file safe (upload to GitHub/Google Drive)')
    console.log('   2. Test the backup: gunzip backup.sql.gz | head -50')
    console.log('   3. Now you can safely deploy your changes!\n')

  } catch (error) {
    console.log(`\n❌ BACKUP FAILED`)
    console.log(`Error: ${error.message}\n`)

    if (error.message.includes('pg_dump')) {
      console.log('Solution: Install PostgreSQL client tools')
      console.log('macOS:  brew install postgresql@15\n')
    }

    process.exit(1)
  } finally {
    rl.close()
  }
}

main()
