import { NextRequest, NextResponse } from 'next/server'
import { getSession, isManager } from '@/lib/auth'
import { exec } from 'child_process'
import path from 'path'
import { promisify } from 'util'

const execPromise = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Path to the backup script
    const scriptPath = path.join(process.cwd(), 'scripts', 'backup.sh')

    // Execute the script
    // Note: We expect GITHUB_TOKEN, GITHUB_BACKUP_REPO, GITHUB_BACKUP_USER to be in process.env
    try {
      const { stdout, stderr } = await execPromise(`bash ${scriptPath}`)
      
      if (stderr && !stdout) {
        console.error('Backup script error:', stderr)
        return NextResponse.json({ error: 'Backup failed', details: stderr }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Backup completed successfully', 
        output: stdout 
      })
    } catch (execError: any) {
      console.error('Execution error:', execError)
      return NextResponse.json({ 
        error: 'Failed to execute backup script', 
        details: execError.message 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Backup API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
