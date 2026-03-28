/**
 * Compress SDK - Video Compressor Module
 *
 * Based on mediabunny Conversion API
 * Docs: https://mediabunny.dev/guide/quick-start
 */

import type { VideoCompressOptions, VideoCompressProgress, VideoCompressResult, VideoQuality } from '../types'

const QUALITY_PRESETS: Record<Exclude<VideoQuality, 'custom'>, {
  videoBitrate: string
  audioBitrate: string
  targetWidth: number
}> = {
  low: {
    videoBitrate: '500k',
    audioBitrate: '32k',
    targetWidth: 640,
  },
  medium: {
    videoBitrate: '1M',
    audioBitrate: '64k',
    targetWidth: 1280,
  },
  high: {
    videoBitrate: '2M',
    audioBitrate: '128k',
    targetWidth: 1920,
  },
}

function parseBitrate(bitrateStr: string): number {
  const match = bitrateStr.match(/^(\d+(?:\.\d+)?)(k|m)?$/i)
  if (!match) throw new Error(`Invalid bitrate format: ${bitrateStr}`)

  const value = parseFloat(match[1])
  const unit = (match[2] || 'b').toLowerCase()

  const multipliers: Record<string, number> = { k: 1e3, m: 1e6, b: 1 }
  return value * multipliers[unit]
}

function resolveOptions(options: VideoCompressOptions) {
  const quality = options.quality || 'medium'
  const preset = quality === 'custom' ? QUALITY_PRESETS.medium : QUALITY_PRESETS[quality]

  return {
    quality,
    targetWidth: options.targetWidth ?? preset.targetWidth,
    targetHeight: options.targetHeight ?? 0,
    videoBitrate: options.videoBitrate || preset.videoBitrate,
    audioBitrate: options.audioBitrate || preset.audioBitrate,
    maintainAspectRatio: options.maintainAspectRatio ?? true,
    trim: options.trim,
  }
}

function getOriginalVideoSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve({ width: video.videoWidth, height: video.videoHeight })
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Failed to get video info'))
    }

    video.src = URL.createObjectURL(file)
  })
}

/**
 * Compress video file
 */
export async function compressVideo(
  file: File,
  options: VideoCompressOptions = {},
  onProgress?: (progress: VideoCompressProgress) => void
): Promise<VideoCompressResult> {
  const resolved = resolveOptions(options)
  const originalSize = file.size

  const videoBitrate = parseBitrate(resolved.videoBitrate)
  const audioBitrate = parseBitrate(resolved.audioBitrate)

  const {
    BlobSource,
    Input,
    Output,
    BufferTarget,
    Mp4OutputFormat,
    Conversion,
    MP4,
  } = await import('mediabunny')

  const source = new BlobSource(file)
  const input = new Input({ source, formats: [MP4] })
  const output = new Output({
    target: new BufferTarget(),
    format: new Mp4OutputFormat(),
  })

  // Calculate target dimensions
  const originalSize_ = await getOriginalVideoSize(file)
  let targetWidth = resolved.targetWidth
  let targetHeight = resolved.targetHeight

  if (resolved.maintainAspectRatio && originalSize_.width > 0) {
    const aspectRatio = originalSize_.width / originalSize_.height

    if (targetWidth && !targetHeight) {
      targetHeight = Math.round(targetWidth / aspectRatio)
    } else if (targetHeight && !targetWidth) {
      targetWidth = Math.round(targetHeight * aspectRatio)
    }
  }

  if (targetWidth && targetWidth > originalSize_.width) {
    targetWidth = originalSize_.width
    targetHeight = originalSize_.height
  }

  const controller = await Conversion.init({
    input,
    output,
    video: {
      width: targetWidth || undefined,
      bitrate: videoBitrate,
    },
    audio: {
      bitrate: audioBitrate,
    },
    ...(resolved.trim ? { trim: resolved.trim } : {}),
  })

  let lastProgress = 0
  const startTime = performance.now()

  controller.onProgress = (np: number) => {
    if (onProgress && np >= lastProgress) {
      const elapsed = (performance.now() - startTime) / 1000
      const speed = np > 0 ? np / elapsed : 0
      const remainingTime = np < 1 ? (1 - np) / speed : 0

      lastProgress = np

      onProgress({
        percent: Math.round(np * 100),
        speed: speed * 10,
        remainingTime,
      })
    }
  }

  await controller.execute()

  const buffer = output.target.buffer
  if (!buffer) {
    throw new Error('Compression failed: output buffer is null')
  }

  const blob = new Blob([buffer], { type: 'video/mp4' })
  const url = URL.createObjectURL(blob)

  return {
    blob,
    url,
    size: blob.size,
    compressionRatio: originalSize / blob.size,
    originalSize,
  }
}
