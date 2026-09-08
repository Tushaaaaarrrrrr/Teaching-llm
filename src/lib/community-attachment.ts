const mimeTypes: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
}

// Older messages store documents in imageUrl too. Inspect the URL pathname,
// ignoring signed query parameters, instead of trusting the field's name.
export function describeCommunityAttachment(raw: string) {
  try {
    const url = new URL(raw, 'https://community.invalid')
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const filename = decodeURIComponent(url.pathname.split('/').pop() || '')
    const extension = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : ''
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'avif'].includes(extension)
    const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
    const name = new RegExp(`^${uuid}\\.[^.]+$`, 'i').test(filename)
      ? `${extension.toUpperCase()} document`
      : filename.replace(new RegExp(`^${uuid}-`, 'i'), '') || 'Attachment'
    return { url: raw, isImage, name, extension, mimeType: mimeTypes[extension] || 'application/octet-stream' }
  } catch { return null }
}
