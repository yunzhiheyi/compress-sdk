# Compress SDK 中文文档

[English](https://github.com/yunzhiheyi/compress-sdk/blob/master/README.md) | 中文

浏览器端媒体压缩 SDK，支持视频和图片压缩。

## 在线演示

- [图片压缩](https://www.maxmax.cc/image-compress)
- [视频压缩](https://www.maxmax.cc/video-compress)

## 功能特点

- **视频压缩** - 基于 mediabunny (WebCodecs)
- **图片压缩** - 基于 jSquash WASM 编码器（MozJPEG、libwebp、OxiPNG、libavif）
- **帧提取** - 按时间戳从视频中提取帧
- **水印支持** - 为图片添加文字水印
- **Nuxt4/Vue3 兼容** - 支持 Vue Composition API
- **TypeScript 支持** - 完整的类型定义

## 安装

```bash
npm install compress-sdk-plus
```

## 快速开始 - Nuxt4

创建插件 `plugins/compress.client.ts`:

```javascript
import {
  parseVideoInfo,
  compressVideo,
  extractFrames,
  extractSingleFrame,
  compressImage,
  getImageInfo,
} from 'compress-sdk-plus'

// 注册为 Nuxt 插件（仅客户端）
export default defineNuxtPlugin(() => {
  return {
    provide: {
      // 通过 $compress.video.* 或 $compress.image.* 访问
      compress: {
        video: { parseVideoInfo, compressVideo, extractFrames, extractSingleFrame },
        image: { compressImage, getImageInfo },
      },
    },
  }
})
```

配置 `nuxt.config.ts`:

```javascript
export default defineNuxtConfig({
  alias: {
    'compress-sdk-plus': '/path/to/node_modules/compress-sdk-plus'
  },
  vite: {
    optimizeDeps: {
      // 预打包这些依赖以加快冷启动
      include: ['mediabunny', '@jsquash/jpeg', '@jsquash/webp', '@jsquash/png', '@jsquash/avif']
    }
  },
  build: {
    // 转码为 commonjs 以提高兼容性
    transpile: ['mediabunny', '@jsquash/jpeg', '@jsquash/webp', '@jsquash/png', '@jsquash/avif']
  }
})
```

## Vue 示例 - 视频压缩

```vue
<template>
  <div>
    <!-- 视频文件选择输入框 -->
    <input type="file" accept="video/*" @change="handleVideoChange" />

    <!-- 压缩按钮，带加载状态 -->
    <button @click="compressVideo" :disabled="!videoFile || isCompressing">
      {{ isCompressing ? '压缩中...' : '压缩视频' }}
    </button>

    <!-- 进度显示 -->
    <div v-if="progress">
      {{ progress.percent }}% - 速度: {{ progress.speed }}x
    </div>

    <!-- 完成后下载链接 -->
    <a v-if="result" :href="result.url" download="compressed.mp4">
      下载
    </a>
  </div>
</template>

<script setup>
// 通过 Nuxt 插件访问 SDK
const { $compress } = useNuxtApp()

// 状态变量
const videoFile = ref(null)         // 已选择的视频文件
const result = ref(null)             // 压缩结果
const progress = ref(null)           // 压缩进度
const isCompressing = ref(false)    // 加载状态

// 处理文件选择
function handleVideoChange(e) {
  videoFile.value = e.target.files[0]
}

// 带进度回调的视频压缩
async function compressVideo() {
  if (!videoFile.value) return
  isCompressing.value = true

  try {
    // 调用 compressVideo，传入选项和进度回调
    result.value = await $compress.video.compressVideo(
      videoFile.value,                   // 源视频文件
      {
        quality: 'medium',             // 质量预设: low | medium | high
        targetWidth: 1280,            // 目标宽度（像素）
        maintainAspectRatio: true,     // 保持原始宽高比
        trim: {                      // 可选：裁剪视频
          start: 0,
          end: 30
        }
      },
      (p) => {                       // 进度回调
        progress.value = p
      }
    )
  } catch (err) {
    console.error('压缩失败:', err)
  } finally {
    isCompressing.value = false
  }
}
</script>
```

## Vue 示例 - 图片压缩加水印

```vue
<template>
  <div>
    <!-- 图片文件输入框 -->
    <input type="file" accept="image/*" @change="handleImageChange" />

    <!-- 格式选择器 -->
    <select v-model="format">
      <option value="webp">WebP (推荐)</option>
      <option value="jpeg">JPEG</option>
      <option value="avif">AVIF (最佳压缩)</option>
      <option value="png">PNG (无损)</option>
    </select>

    <!-- 质量滑块 -->
    <label>
      质量: {{ quality }}
      <input type="range" v-model.number="quality" min="0.1" max="1" step="0.1" />
    </label>

    <!-- 水印选项 -->
    <label>
      <input type="checkbox" v-model="enableWatermark" />
      添加水印
    </label>

    <div v-if="enableWatermark">
      <input type="text" v-model="watermarkText" placeholder="水印文字" />
      <select v-model="watermarkPosition">
        <option value="bottom-right">右下角</option>
        <option value="bottom-left">左下角</option>
        <option value="top-right">右上角</option>
        <option value="top-left">左上角</option>
        <option value="center">居中</option>
      </select>
    </div>

    <!-- 压缩按钮 -->
    <button @click="compressImage" :disabled="!imageFile">
      压缩图片
    </button>

    <!-- 结果显示 -->
    <div v-if="result">
      <p>原图: {{ formatSize(result.originalSize) }}</p>
      <p>压缩后: {{ formatSize(result.size) }}</p>
      <p>节省: {{ ((1 - result.size / result.originalSize) * 100).toFixed(0) }}%</p>
      <img :src="result.url" alt="Compressed" />
      <a :href="result.url" :download="`compressed.${format}`">下载</a>
    </div>
  </div>
</template>

<script setup>
const { $compress } = useNuxtApp()

const imageFile = ref(null)
const format = ref('webp')         // 输出格式
const quality = ref(0.92)          // 质量 0-1
const enableWatermark = ref(false)
const watermarkText = ref('© Your Name')
const watermarkPosition = ref('bottom-right')
const result = ref(null)

// 格式化文件大小为可读字符串
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function handleImageChange(e) {
  imageFile.value = e.target.files[0]
}

async function compressImage() {
  if (!imageFile.value) return

  // 构建选项对象
  const options = {
    format: format.value,             // 输出格式: webp | jpeg | png | avif
    quality: quality.value,           // 质量 0-1
    targetWidth: 1920,              // 目标宽度（高度自动计算）
  }

  // 如果启用水印则添加水印配置
  if (enableWatermark.value && watermarkText.value) {
    options.watermark = {
      text: watermarkText.value,     // 水印文字
      position: watermarkPosition.value, // 位置
      fontSize: 24,                  // 字体大小
      opacity: 0.8,                 // 透明度 0-1
    }
  }

  // 压缩并获取结果
  result.value = await $compress.image.compressImage(imageFile.value, options)
}
</script>
```

## API 参考

### 视频 API

| 方法 | 说明 |
|------|------|
| `parseVideoInfo(file)` | 获取视频元数据（时长、大小、分辨率等） |
| `compressVideo(file, options, onProgress?)` | 带进度追踪的视频压缩 |
| `extractFrames(file, options)` | 按间隔提取多帧 |
| `extractSingleFrame(file, time)` | 提取指定时间的单帧 |

### 图片 API

| 方法 | 说明 |
|------|------|
| `getImageInfo(file)` | 获取图片元数据（尺寸、大小、格式） |
| `compressImage(file, options)` | 带可选水印的图片压缩 |

## 参数选项

### 视频选项

```typescript
{
  quality?: 'low' | 'medium' | 'high'  // 质量预设
  targetWidth?: number                    // 目标宽度（像素）
  targetHeight?: number                   // 目标高度（像素）
  maintainAspectRatio?: boolean           // 保持宽高比（默认: true）
  trim?: { start: number, end: number } // 裁剪视频片段（秒）
}
```

### 图片选项

```typescript
{
  format?: 'jpeg' | 'webp' | 'png' | 'avif'  // 输出格式
  quality?: number                            // 质量 0-1（默认: 0.92）
  targetWidth?: number                       // 目标宽度
  targetHeight?: number                      // 目标高度
  maintainAspectRatio?: boolean              // 保持宽高比（默认: true）
  watermark?: {
    text?: string              // 水印文字
    position?: WatermarkPosition  // 位置
    fontSize?: number          // 字体大小
    opacity?: number          // 透明度 0-1
  }
}
```

## 水印位置

```
'top-left'      'top-center'      'top-right'       // 上左          上中          上右
'center-left'   'center'          'center-right'    // 左中          居中          右中
'bottom-left'   'bottom-center'   'bottom-right'    // 下左          下中          下右
```

## 格式对比

| 格式 | 压缩率 | 浏览器支持 | 透明通道 |
|------|--------|------------|----------|
| JPEG | 中等 | 通用 | 不支持 |
| WebP | 较好 | 现代浏览器 | 不支持 |
| PNG | 无损 | 通用 | 支持 |
| AVIF | **最佳** | Chrome 85+ | 不支持 |

## 许可证

MIT
