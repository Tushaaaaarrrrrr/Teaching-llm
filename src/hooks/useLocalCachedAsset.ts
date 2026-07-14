'use client'

import { useState, useEffect } from 'react'

export function useLocalCachedAsset(defaultSrc: string): string {
  const [src, setSrc] = useState(defaultSrc)

  useEffect(() => {
    let active = true

    const loadCachedAsset = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core')
        // Only run on native platform (Android APK)
        if (!Capacitor.isNativePlatform()) return

        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        const { App } = await import('@capacitor/app')

        // Clean the default source to create a safe file name (e.g. /splash-screen.png -> splash-screen.png)
        const cleanName = defaultSrc.replace(/^\//, '').replace(/[^a-zA-Z0-9_.-]/g, '_')
        
        // Get app version to force cache updates when the APK version bumps
        const appInfo = await App.getInfo()
        const appVersion = appInfo.version
        const fileName = `cached_${appVersion}_${cleanName}`

        try {
          // Check if file is already cached on local disk
          const fileInfo = await Filesystem.stat({
            path: fileName,
            directory: Directory.Data,
          })
          
          if (active) {
            const localUri = Capacitor.convertFileSrc(fileInfo.uri)
            setSrc(localUri)
            console.log(`[useLocalCachedAsset] Loaded asset from device storage: ${defaultSrc} -> ${localUri}`)
          }
        } catch (e) {
          // File does not exist, serve remote asset and download in background
          console.log(`[useLocalCachedAsset] Asset not cached. Downloading in background: ${defaultSrc}`)
          
          const remoteUrl = window.location.origin + (defaultSrc.startsWith('/') ? defaultSrc : '/' + defaultSrc)
          
          Filesystem.downloadFile({
            url: remoteUrl,
            path: fileName,
            directory: Directory.Data,
          }).then((res) => {
            console.log(`[useLocalCachedAsset] Successfully cached asset: ${defaultSrc} -> ${res.path}`)
            
            // Clean up older cached assets from previous versions in background
            Filesystem.readdir({
              path: '',
              directory: Directory.Data,
            }).then((dirResult) => {
              dirResult.files.forEach((file) => {
                if (file.name.startsWith('cached_') && !file.name.includes(appVersion)) {
                  Filesystem.deleteFile({
                    path: file.name,
                    directory: Directory.Data,
                  }).catch(() => {})
                }
              })
            }).catch(() => {})
          }).catch((err) => {
            console.warn(`[useLocalCachedAsset] Failed to download and cache asset: ${defaultSrc}`, err)
          })
        }
      } catch (err) {
        console.warn(`[useLocalCachedAsset] Failed to initialize local caching for: ${defaultSrc}`, err)
      }
    }

    loadCachedAsset()

    return () => {
      active = false
    }
  }, [defaultSrc])

  return src
}
