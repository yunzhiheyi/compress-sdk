/**
 * Compress SDK - Shared Utilities
 *
 * Common utility functions used across video and image modules
 */

/**
 * Format file size to human readable string
 */
export function formatSize(bytes: number | undefined): string {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas')
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
}

/**
 * Load an image from a File
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Load an image from a URL
 */
export function loadImageFromUrl(url: string, crossOrigin = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    if (crossOrigin) img.crossOrigin = 'anonymous'
    img.src = url
  })
}

/**
 * Calculate target dimensions maintaining aspect ratio
 */
export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth?: number,
  targetHeight?: number,
  maintainAspectRatio = true
): { width: number; height: number } {
  let finalWidth = originalWidth
  let finalHeight = originalHeight

  if (maintainAspectRatio) {
    if (targetWidth && !targetHeight) {
      finalWidth = targetWidth
      finalHeight = Math.round((targetWidth / originalWidth) * originalHeight)
    } else if (targetHeight && !targetWidth) {
      finalHeight = targetHeight
      finalWidth = Math.round((targetHeight / originalHeight) * originalWidth)
    } else if (targetWidth && targetHeight) {
      // Fit within target dimensions, maintaining aspect ratio
      const ratioByWidth = targetWidth / originalWidth
      const ratioByHeight = targetHeight / originalHeight
      const ratio = Math.min(ratioByWidth, ratioByHeight)
      finalWidth = Math.round(originalWidth * ratio)
      finalHeight = Math.round(originalHeight * ratio)
    }
  } else {
    if (targetWidth) finalWidth = targetWidth
    if (targetHeight) finalHeight = targetHeight
  }

  return { width: finalWidth, height: finalHeight }
}

/**
 * Revoke object URL if valid
 */
export function revokeUrl(url: string | undefined): void {
  if (url) URL.revokeObjectURL(url)
}

/**
 * Convert Blob to Base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
