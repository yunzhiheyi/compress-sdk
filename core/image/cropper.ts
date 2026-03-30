/**
 * Compress SDK - Image Cropper Module
 *
 * Pure cropping logic: crops an image to a specified region
 */

import type { CropRegion, ImageCompressResult } from '../types'
import { loadImage, supportsWebP } from '../utils'

async function encodeImage(
  canvas: HTMLCanvasElement,
  format: 'jpeg' | 'webp' | 'png' | 'avif',
  quality: number
): Promise<Blob> {
  async function tryJSquash() {
    switch (format) {
      case 'jpeg': {
        const { default: encodeJpeg } = await import('@jsquash/jpeg')
        const ctx = canvas.getContext('2d')!
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const arrayBuffer = await encodeJpeg(imageData, { quality: Math.round(quality * 100) })
        return new Blob([arrayBuffer], { type: 'image/jpeg' })
      }
      case 'webp': {
        const { default: encodeWebp } = await import('@jsquash/webp')
        const ctx = canvas.getContext('2d')!
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const arrayBuffer = await encodeWebp(imageData, { quality: Math.round(quality * 100) })
        return new Blob([arrayBuffer], { type: 'image/webp' })
      }
      case 'png': {
        const { default: encodePng } = await import('@jsquash/png')
        const ctx = canvas.getContext('2d')!
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const arrayBuffer = await encodePng(imageData)
        return new Blob([arrayBuffer], { type: 'image/png' })
      }
      case 'avif': {
        const { default: encodeAvif } = await import('@jsquash/avif')
        const ctx = canvas.getContext('2d')!
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const arrayBuffer = await encodeAvif(imageData, { quality: Math.round(quality * 100) })
        return new Blob([arrayBuffer], { type: 'image/avif' })
      }
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  try {
    return await tryJSquash()
  } catch {
    // Fallback to native canvas
    return new Promise((resolve, reject) => {
      const mimeType = format === 'png' ? 'image/png' : `image/${format}`
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to encode image'))
        },
        mimeType,
        format === 'png' ? undefined : 0.92
      )
    })
  }
}

/**
 * Crop an image to a specified region
 *
 * @param file - Source image file
 * @param region - Crop region in 0-1 relative coordinates
 * @param outputWidth - Optional output width in pixels (defaults to cropped pixel width)
 * @param outputHeight - Optional output height in pixels (defaults to cropped pixel height)
 * @param format - Output format
 * @param quality - Output quality 0-1
 */
export async function cropImage(
  file: File,
  region: CropRegion,
  outputWidth?: number,
  outputHeight?: number,
  format: 'jpeg' | 'webp' | 'png' | 'avif' = supportsWebP() ? 'webp' : 'jpeg',
  quality = 0.92
): Promise<ImageCompressResult> {
  const img = await loadImage(file)
  const originalSize = file.size

  // Calculate pixel coordinates from 0-1 region
  const srcX = region.x * img.naturalWidth
  const srcY = region.y * img.naturalHeight
  const srcW = region.width * img.naturalWidth
  const srcH = region.height * img.naturalHeight

  const finalWidth = outputWidth ?? Math.round(srcW)
  const finalHeight = outputHeight ?? Math.round(srcH)

  const canvas = document.createElement('canvas')
  canvas.width = finalWidth
  canvas.height = finalHeight
  const ctx = canvas.getContext('2d')!

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, finalWidth, finalHeight)

  URL.revokeObjectURL(img.src)

  const blob = await encodeImage(canvas, format, quality)
  const url = URL.createObjectURL(blob)

  return {
    blob,
    url,
    size: blob.size,
    width: finalWidth,
    height: finalHeight,
    compressionRatio: originalSize / blob.size,
    originalSize,
  }
}
