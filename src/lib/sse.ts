import { EventEmitter } from 'events'

const globalForSse = globalThis as unknown as { sseEmitter: EventEmitter | undefined }

export const sseEmitter = globalForSse.sseEmitter ?? new EventEmitter()

// Increase max listeners since a single large class could have many concurrent users
sseEmitter.setMaxListeners(1000)

if (process.env.NODE_ENV !== 'production') {
  globalForSse.sseEmitter = sseEmitter
}
