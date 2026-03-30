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
 * @returns [promise, cancelFn] - cancelFn 可在 promise resolve 前调用以取消压缩
 */
export function compressVideo(
  file: File,
  options: VideoCompressOptions = {},
  onProgress?: (progress: VideoCompressProgress) => void
): [Promise<VideoCompressResult>, () => void] {
  let cancelCalled = false

  const promise = (async () => {
    const resolved = resolveOptions(options)
    const originalSize = file.size

    const videoBitrate = parseBitrate(resolved.videoBitrate)
    const audioBitrate = parseBitrate(resolved.audioBitrate)

    const source = new BlobSource(file)
    const fileSize = await source.getSize()
    if (!fileSize) throw new Error('文件大小为 0 或不可访问')
    if (cancelCalled) throw new Error('Compression cancelled')

    const input = new Input({ source, formats: ALL_FORMATS })

    const vtrack = await input.getPrimaryVideoTrack().catch(() => null)
    const atrack = input.getPrimaryAudioTrack
      ? await input.getPrimaryAudioTrack().catch(() => null)
      : null

    if (!vtrack && !atrack) throw new Error('未检测到有效音视频轨')
    if (cancelCalled) throw new Error('Compression cancelled')

    const oW = vtrack?.displayWidth ?? 0

    let targetWidth: number | undefined
    if (!vtrack) {
      targetWidth = undefined
    } else if (resolved.targetWidth) {
      targetWidth = Math.min(resolved.targetWidth, oW)
    } else {
      targetWidth = oW
    }

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

    const firstTimestamp = await input.getFirstTimestamp().catch(() => 0)
    const duration = await input.computeDuration().catch(() => 0)

    const trimStart = Math.max(firstTimestamp * 2, resolved.trim?.start ?? 0)
    const trimEnd = resolved.trim?.end ?? duration
    conversionOpts.trim = {
      start: trimStart,
      end: trimEnd,
    }

    const controller = await Conversion.init(conversionOpts)
    let lastProgress = 0
    const startTime = performance.now()

    controller.onProgress = (np: number) => {
      if (cancelCalled) return
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

    if (cancelCalled) throw new Error('Compression cancelled')

    await controller.execute()

    if (cancelCalled) throw new Error('Compression cancelled')

    const buffer = output.target.buffer
    if (!buffer) throw new Error('Compression failed: output buffer is null')

    const blob = new Blob([buffer], { type: 'video/mp4' })
    const url = URL.createObjectURL(blob)

    return {
      blob,
      url,
      size: blob.size,
      compressionRatio: originalSize / blob.size,
      originalSize,
    }
  })()

  const cancel = () => {
    cancelCalled = true
  }

  return [promise, cancel]
}
