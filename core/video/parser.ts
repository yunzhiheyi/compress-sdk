/**
 * Compress SDK - Video Parser Module
 *
 * Based on mediabunny for video metadata reading
 * Docs: https://mediabunny.dev/guide/quick-start
 */

import type { VideoInfo } from '../types'

/**
 * Parse video information from File
 */
export async function parseVideoInfo(file: File): Promise<VideoInfo> {
  const { BlobSource, Input, ALL_FORMATS } = await import('mediabunny')

  const source = new BlobSource(file)
  const input = new Input({
    source,
    formats: ALL_FORMATS,
  })

  try {
    const duration = await input.computeDuration()
    const videoTracks = await input.getVideoTracks()
    const audioTracks = await input.getAudioTracks()
    const primaryVideoTrack = await input.getPrimaryVideoTrack()

    let width = 0
    let height = 0
    let bitrate = 0

    if (primaryVideoTrack) {
      width = primaryVideoTrack.displayWidth
      height = primaryVideoTrack.displayHeight

      const trackBitrate = primaryVideoTrack.averageBitrate
      bitrate = trackBitrate > 0 ? trackBitrate : (duration > 0 ? Math.round((file.size * 8) / duration) : 0)

      const canDecode = await primaryVideoTrack.canDecode().catch(() => 'unknown')
      console.log('[SDK parseVideoInfo] codec:', primaryVideoTrack.codec, 'internalCodecId:', primaryVideoTrack.internalCodecId, 'canDecode:', canDecode)
    }

    const mimeType = await input.getMimeType()

    return {
      duration,
      width,
      height,
      frameRate: 30, // mediabunny doesn't expose frameRate directly
      bitrate,
      size: file.size,
      type: mimeType || file.type || 'video/mp4',
      videoTracks: videoTracks.length,
      audioTracks: audioTracks.length,
    }
  } finally {
    if (typeof input.dispose === 'function') {
      try { input.dispose() } catch {}
    }
  }
}

/**
 * Parse video info from URL
 */
export async function parseVideoInfoFromUrl(url: string): Promise<VideoInfo & { url: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`)
  }

  const blob = await response.blob()
  const file = new File([blob], 'video', { type: blob.type })
  const info = await parseVideoInfo(file)

  return {
    ...info,
    url,
  }
}
