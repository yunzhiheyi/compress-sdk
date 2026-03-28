/**
 * Compress SDK - Video Frame Extractor Module
 *
 * Based on mediabunny CanvasSink API
 * Docs: https://mediabunny.dev/guide/quick-start
 */

import type { ExtractedFrame, ExtractOptions } from '../types'
import { blobToBase64 } from '../utils'

function getDefaultOptions(): Required<ExtractOptions> {
  return {
    times: [],
    interval: 1,
    format: 'jpeg',
    quality: 0.9,
  }
}

function generateTimes(duration: number, interval: number): number[] {
  const times: number[] = []
  for (let t = 0; t <= duration; t += interval) {
    times.push(Math.round(t * 100) / 100)
  }
  return times
}

function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  format: 'png' | 'jpeg' | 'webp',
  quality: number
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({
      type: `image/${format}`,
      quality,
    })
  } else {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to convert canvas to blob'))
        },
        `image/${format}`,
        format === 'jpeg' ? quality : undefined
      )
    })
  }
}

/**
 * Extract frames from video file
 */
export async function extractFrames(
  file: File,
  options: ExtractOptions = {}
): Promise<ExtractedFrame[]> {
  const opts = { ...getDefaultOptions(), ...options }

  if (!opts.times?.length && !opts.interval) {
    throw new Error('Either times or interval must be specified')
  }

  const { BlobSource, Input, CanvasSink, MP4 } = await import('mediabunny')

  const source = new BlobSource(file)
  const input = new Input({ source, formats: [MP4] })

  try {
    const videoTrack = await input.getPrimaryVideoTrack()
    if (!videoTrack) {
      throw new Error('No video track found in file')
    }

    const duration = await input.computeDuration()
    const times = opts.times?.length ? opts.times : generateTimes(duration, opts.interval)

    const canvasSink = new CanvasSink(videoTrack)
    const results: ExtractedFrame[] = []

    for await (const wrappedCanvas of canvasSink.canvasesAtTimestamps(times)) {
      if (!wrappedCanvas) continue

      const { canvas, timestamp } = wrappedCanvas
      const blob = await canvasToBlob(canvas, opts.format, opts.quality)
      const base64 = await blobToBase64(blob)
      const url = URL.createObjectURL(blob)

      results.push({ time: timestamp, blob, base64, url })
    }

    return results
  } finally {
    input.dispose()
  }
}

/**
 * Extract single frame at specified time
 */
export async function extractSingleFrame(
  file: File,
  time: number,
  options: Omit<ExtractOptions, 'times' | 'interval'> = {}
): Promise<ExtractedFrame> {
  const frames = await extractFrames(file, { ...options, times: [time] })

  if (!frames.length) {
    throw new Error(`Failed to extract frame at ${time}s`)
  }

  return frames[0]
}
