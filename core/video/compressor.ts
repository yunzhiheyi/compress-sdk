/**
 * Compress SDK - Video Compressor Module
 *
 * Based on mediabunny Conversion API
 * Docs: https://mediabunny.dev/guide/quick-start
 */

import type { VideoCompressOptions, VideoCompressProgress, VideoCompressResult, VideoQuality } from '../types'
import {
  BlobSource,
  Input,
  Output,
  BufferTarget,
  Mp4OutputFormat,
  Conversion,
  ALL_FORMATS,
} from 'mediabunny';

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
/**
 * 压缩视频文件
 *
 * @example
 * // 基础用法
 * const { promise, cancel } = compressVideo(file)
 * const result = await promise
 *
 * @example
 * // 带进度 + 取消
 * const { promise, cancel } = compressVideo(file, { targetWidth: 1280 }, (p) => {
 *   console.log(`${p.percent}%`)
 * })
 * cancelBtn.onclick = cancel
 * const result = await promise
 */
export function compressVideo(
  file: File,
  options: VideoCompressOptions = {},
  onProgress?: (progress: VideoCompressProgress) => void
): { promise: Promise<VideoCompressResult>; cancel: () => void } {
  let cancelled = false

  const promise = (async (): Promise<VideoCompressResult> => {
    const resolved = resolveOptions(options)
    const originalSize = file.size

    const videoBitrate = parseBitrate(resolved.videoBitrate)
    const audioBitrate = parseBitrate(resolved.audioBitrate)

    // ── Source ──────────────────────────────────────────────────────────────
    const source = new BlobSource(file)
    const fileSize = await source.getSize()
    if (!fileSize) throw new Error('file size is 0 or inaccessible')
    if (cancelled) throw new Error('cancelled')

    // ── Tracks ───────────────────────────────────────────────────────────────
    const input = new Input({ source, formats: ALL_FORMATS })

    const [vtrack, atrack] = await Promise.all([
      input.getPrimaryVideoTrack().catch(() => null),
      input.getPrimaryAudioTrack?.().catch(() => null) ?? null,
    ])

    if (!vtrack && !atrack) throw new Error('no valid video or audio track found')
    if (cancelled) throw new Error('cancelled')

    // ── Target width ─────────────────────────────────────────────────────────
    const originalWidth = vtrack?.displayWidth ?? 0
    const targetWidth = !vtrack
      ? undefined
      : resolved.targetWidth
        ? Math.min(resolved.targetWidth, originalWidth)
        : originalWidth

    // ── Output ───────────────────────────────────────────────────────────────
    const output = new Output({
      target: new BufferTarget(),
      format: new Mp4OutputFormat(),
    })

    const conversionOpts: any = { input, output }

    if (vtrack) {
      conversionOpts.video = (track: any) => ({
        width: targetWidth,
        bitrate: videoBitrate,
        discard: track.number > 1,
      })
    }

    conversionOpts.audio = (track: any) => ({
      bitrate: audioBitrate,
      discard: track.number > 1,
    })

    // ── Trim ─────────────────────────────────────────────────────────────────
    const [firstTimestamp, duration] = await Promise.all([
      input.getFirstTimestamp().catch(() => 0),
      input.computeDuration().catch(() => 0),
    ])

    conversionOpts.trim = {
      start: Math.max(firstTimestamp * 2, resolved.trim?.start ?? 0),
      end: resolved.trim?.end ?? duration,
    }

    // ── Conversion ───────────────────────────────────────────────────────────
    const controller = await Conversion.init(conversionOpts)

    let lastProgress = 0
    const startTime = performance.now()

    controller.onProgress = (np: number) => {
      if (cancelled || np < lastProgress) return
      lastProgress = np

      if (onProgress) {
        const elapsed = (performance.now() - startTime) / 1000
        const speed = elapsed > 0 ? np / elapsed : 0
        onProgress({
          percent: Math.round(np * 100),
          speed: speed * 10,
          remainingTime: speed > 0 ? (1 - np) / speed : 0,
        })
      }
    }

    if (cancelled) {
      controller.cancel?.()
      throw new Error('cancelled')
    }

    try {
      await controller.execute()
    } catch (err: any) {
      if (cancelled) throw new Error('cancelled')
      throw err
    }

    if (cancelled) throw new Error('cancelled')

    // ── Result ────────────────────────────────────────────────────────────────
    const buffer = output.target.buffer
    if (!buffer) throw new Error('buffer is empty')

    const blob = new Blob([buffer], { type: 'video/mp4' })

    return {
      blob,
      url: URL.createObjectURL(blob),
      size: blob.size,
      compressionRatio: originalSize / blob.size,
      originalSize,
    }
  })()

  const cancel = () => {
    cancelled = true
  }

  return { promise, cancel }
}