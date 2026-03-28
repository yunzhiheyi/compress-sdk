/**
 * Compress SDK - Image Compressor Module
 *
 * Based on Canvas API + jSquash WASM encoders for high-quality compression
 */

import type { ImageCompressOptions, ImageCompressResult, ImageInfo, WatermarkOptions } from '../types'
import { calculateDimensions, loadImage, supportsWebP } from '../utils'

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: WatermarkOptions
): void {
  const {
    text,
    position = 'bottom-right',
    x = 10,
    y = 10,
    fontSize = 24,
    color = 'rgba(255,255,255,0.7)',
    opacity = 0.8,
  } = options

  if (!text) return

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.font = `${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
  ctx.fillStyle = color

  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  const textHeight = fontSize

  let posX = x
  let posY = y

  switch (position) {
    case 'top-left':
      posX = x
      posY = y
      ctx.textBaseline = 'top'
      break
    case 'top-center':
      posX = (width - textWidth) / 2
      posY = y
      ctx.textBaseline = 'top'
      break
    case 'top-right':
      posX = width - textWidth - x
      posY = y
      ctx.textBaseline = 'top'
      break
    case 'center-left':
      posX = x
      posY = (height - textHeight) / 2
      ctx.textBaseline = 'middle'
      break
    case 'center':
      posX = (width - textWidth) / 2
      posY = (height - textHeight) / 2
      ctx.textBaseline = 'middle'
      break
    case 'center-right':
      posX = width - textWidth - x
      posY = (height - textHeight) / 2
      ctx.textBaseline = 'middle'
      break
    case 'bottom-left':
      posX = x
      posY = height - y
      ctx.textBaseline = 'bottom'
      break
    case 'bottom-center':
      posX = (width - textWidth) / 2
      posY = height - y
      ctx.textBaseline = 'bottom'
      break
    case 'bottom-right':
      posX = width - textWidth - x
      posY = height - y
      ctx.textBaseline = 'bottom'
      break
  }

  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  ctx.fillText(text, posX, posY)
  ctx.restore()
}

async function encodeWithJSquash(
  imageData: ImageData,
  format: 'jpeg' | 'webp' | 'png' | 'avif',
  quality: number
): Promise<Blob> {
  switch (format) {
    case 'jpeg': {
      const { default: encodeJpeg } = await import('@jsquash/jpeg')
      const arrayBuffer = await encodeJpeg(imageData, { quality: Math.round(quality * 100) })
      return new Blob([arrayBuffer], { type: 'image/jpeg' })
    }
    case 'webp': {
      const { default: encodeWebp } = await import('@jsquash/webp')
      const arrayBuffer = await encodeWebp(imageData, { quality: Math.round(quality * 100) })
      return new Blob([arrayBuffer], { type: 'image/webp' })
    }
    case 'png': {
      const { default: encodePng } = await import('@jsquash/png')
      const arrayBuffer = await encodePng(imageData)
      return new Blob([arrayBuffer], { type: 'image/png' })
    }
    case 'avif': {
      const { default: encodeAvif } = await import('@jsquash/avif')
      const arrayBuffer = await encodeAvif(imageData, { quality: Math.round(quality * 100) })
      return new Blob([arrayBuffer], { type: 'image/avif' })
    }
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

function encodeWithCanvas(
  canvas: HTMLCanvasElement,
  format: 'jpeg' | 'webp' | 'png'
): Promise<Blob> {
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

/**
 * Get image information
 */
export async function getImageInfo(file: File): Promise<ImageInfo> {
  const img = await loadImage(file)
  URL.revokeObjectURL(img.src)

  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    size: file.size,
    type: file.type,
    format: file.type.split('/')[1] || 'unknown',
    hasAlpha: file.type.includes('png') || file.type.includes('webp'),
  }
}

/**
 * Compress image file
 */
export async function compressImage(
  file: File,
  options: ImageCompressOptions = {}
): Promise<ImageCompressResult> {
  const {
    targetWidth,
    targetHeight,
    maintainAspectRatio = true,
    format = supportsWebP() ? 'webp' : 'jpeg',
    quality = 0.92,
    watermark,
  } = options

  const img = await loadImage(file)
  const originalSize = file.size
  const originalWidth = img.naturalWidth
  const originalHeight = img.naturalHeight

  const { width: finalWidth, height: finalHeight } = calculateDimensions(
    originalWidth,
    originalHeight,
    targetWidth,
    targetHeight,
    maintainAspectRatio
  )

  const canvas = document.createElement('canvas')
  canvas.width = finalWidth
  canvas.height = finalHeight
  const ctx = canvas.getContext('2d')!

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, finalWidth, finalHeight)

  if (watermark?.text) {
    drawWatermark(ctx, finalWidth, finalHeight, watermark)
  }

  const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight)
  URL.revokeObjectURL(img.src)

  let blob: Blob
  try {
    blob = await encodeWithJSquash(imageData, format, quality)
  } catch (err) {
    console.warn('jSquash encoding failed, falling back to Canvas:', err)
    blob = await encodeWithCanvas(canvas, format === 'avif' ? 'webp' : format)
  }

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
