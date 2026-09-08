const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
function load(file, mocks = {}) {
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(source, { exports, URL, Buffer, console, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://storage.example', SUPABASE_SERVICE_ROLE_KEY: 'test-only' } },
    require: name => mocks[name] || require(name),
  })
  return exports
}
const helper = load('src/lib/community-attachment.ts')
const describe = helper.describeCommunityAttachment
const uuid = '12345678-1234-1234-1234-123456789abc'

test('documents in legacy imageUrl are classified by pathname, not the field or signed query', () => {
  for (const extension of ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip']) {
    const attachment = describe(`https://storage.example/${uuid}.${extension.toUpperCase()}?token=preview.png`)
    assert.equal(attachment.isImage, false)
    assert.equal(attachment.name, `${extension.toUpperCase()} document`)
    assert.notEqual(attachment.mimeType, 'application/octet-stream')
  }
  assert.equal(describe(`https://storage.example/${uuid}-Week%201.pdf`).name, 'Week 1.pdf')
  assert.equal(describe('/files/PHOTO.JPG?download=notes.pdf').isImage, true)
  assert.equal(describe('javascript:alert(1)'), null)
  assert.equal(describe('data:text/html,hello'), null)
})

test('web renders documents as accessible opening links and images as previews', () => {
  const Component = load('src/components/CommunityAttachment.tsx', { '@/lib/community-attachment': helper }).default
  const url = 'https://storage.example/Week%201.pdf'
  const document = renderToStaticMarkup(React.createElement(Component, { url, onImageClick: () => {} }))
  assert.ok(document.includes(`href="${url}"`))
  assert.ok(document.includes('target="_blank"'))
  assert.ok(document.includes('Open Week 1.pdf'))
  assert.ok(!document.includes('<img'))
  const image = renderToStaticMarkup(React.createElement(Component, { url: 'https://storage.example/photo.png', onImageClick: () => {} }))
  assert.ok(image.includes('<img'))
})

test('upload preserves a safe filename and correct MIME type; keeps 20 MB/type restrictions', async () => {
  let uploaded
  const route = load('src/app/api/upload/chat-image/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/auth': { getSession: async () => ({ userId: 'student-a' }) },
    '@/lib/db': { prisma: Object.fromEntries(['communityMessage', 'chatMessage', 'ticketReply'].map(key => [key, { count: async () => 0 }])) },
    '@supabase/supabase-js': { createClient: () => ({ storage: { from: () => ({
      upload: async (key, bytes, options) => { uploaded = { key, options }; return {} },
      getPublicUrl: key => ({ data: { publicUrl: `https://storage.example/${key}` } }),
    }) } }) },
  })
  const request = (name, size = 5) => ({ formData: async () => ({ get: () => ({ name, size, arrayBuffer: async () => Buffer.from('%PDF-') }) }) })
  const response = await route.POST(request('../Week 1.PDF'))
  assert.equal(response.status, 200)
  assert.equal(uploaded.options.contentType, 'application/pdf')
  assert.match(uploaded.key, /^chat-files\/[a-f0-9-]+-___Week_1\.pdf$/)
  assert.equal(describe(response.body.url).isImage, false)
  assert.equal(response.body.name, '../Week 1.PDF')
  assert.equal((await route.POST(request('file.pdf', 21 * 1024 * 1024))).status, 400)
  assert.equal((await route.POST(request('file.html'))).status, 400)
})
