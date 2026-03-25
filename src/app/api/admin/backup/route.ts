import { NextRequest, NextResponse } from 'next/server'
import { getSession, isManager } from '@/lib/auth'
import { execFile } from 'child_process'
import path from 'path'
import { promisify } from 'util'

const execFilePromise = promisify(execFile)

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isManager(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Path to the backup script
    const scriptPath = path.join(process.cwd(), 'scripts', 'backup.sh')

    // Execute the script using execFile (no shell interpretation = no injection risk)
    try {
      const { stdout, stderr } = await execFilePromise('bash', [scriptPath])
      
      if (stderr && !stdout) {
        console.error('Backup script error:', stderr)
        return NextResponse.json({ error: 'Backup failed' }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Backup completed successfully'
      })
    } catch (execError: any) {
      console.error('Execution error:', execError)
      return NextResponse.json({ 
        error: 'Failed to execute backup script'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Backup API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
