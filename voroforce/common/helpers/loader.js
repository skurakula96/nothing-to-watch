import { CustomEventTarget } from '../../utils/custom-event-target'

class LoaderEvent extends Event {
  constructor(name, data) {
    super(name ?? 'loaded')
    this.data = data
  }
}

export class Loader extends CustomEventTarget {
  constructor(sharedLoadedMediaVersionLayersData, config) {
    super()

    this.sharedLoadedMediaVersionLayersData =
      sharedLoadedMediaVersionLayersData?.sharedLoadedMediaVersionLayersData
    this.config = config.media

    this.loadedIndex = 0
    this.loadingMediaLayers = 0
  }

  preloadAllMediaLayersVersion0(onLoad) {
    this.preloadAllMediaLayersForVersion(0, onLoad)
  }

  preloadAllMediaLayersForVersion(versionIndex, onLoad) {
    const count = this.config.versions[versionIndex]?.layers
    if (!count) {
      this.dispatchEvent(new LoaderEvent('preloaded'))
      onLoad?.()
      return
    }
    let loaded = 0
    const onLoadLayer = () => {
      loaded++
      if (loaded === count) {
        this.dispatchEvent(new LoaderEvent('preloaded'))
        onLoad?.()
      }
    }
    for (let i = 0; i < count; i++) {
      void this.loadMediaLayer(versionIndex, i, onLoadLayer)
    }
  }

  preloadFirstMediaLayerAllGridVersions(onLoad) {
    const count = this.config.versions.filter(
      ({ type, layers }) => (!type || type === 'compressed-grid') && layers > 0,
    ).length
    if (!count) {
      this.dispatchEvent(new LoaderEvent('preloaded'))
      onLoad?.()
      return
    }
    let loaded = 0
    const onLoadLayer = () => {
      loaded++
      if (loaded === count) {
        this.dispatchEvent(new LoaderEvent('preloaded'))
        onLoad?.()
      }
    }
    for (let i = 0; i < this.config.versions.length; i++) {
      const type = this.config.versions[i].type
      const layers = this.config.versions[i].layers
      if (type && type !== 'compressed-grid') continue
      if (!layers || layers < 1) continue
      void this.loadMediaLayer(i, 0, onLoadLayer)
    }
  }

  async loadMediaLayer(versionIndex, layerIndex, onLoad) {
    if (
      this.sharedLoadedMediaVersionLayersData[versionIndex].data[layerIndex] !==
      0
    )
      return

    const baseUrl = this.config.baseUrl
    const config = this.config.versions[versionIndex]
    const ext =
      !config.type || config.type === 'compressed-grid'
        ? this.config.compressionFormat
        : undefined

    let src
    if (typeof config.layerSrcFormat === 'function') {
      src = await config.layerSrcFormat(layerIndex, this.store)
    } else {
      src = `${config.layerSrcFormat.startsWith('/') ? baseUrl : ''}${config.layerSrcFormat
        .replaceAll('{INDEX}', `${(config.layerIndexStart ?? 0) + layerIndex}`)
        .replaceAll('{EXT}', ext)}`
    }

    if (!src) return

    this.loadingMediaLayers++
    this.sharedLoadedMediaVersionLayersData[versionIndex].data[layerIndex] = 1

    let bytes
    const type = config.type ?? 'compressed-grid'

    const isDds = ext === 'dds'
    const isKtx = ext === 'ktx'

    try {
      if (isDds) {
        // DDS File format constants
        const MAGIC = 0x20534444
        const DDPF_FOURCC = 0x4

        // DXT compression formats
        const FOURCC_DXT1 = 0x31545844

        const response = await fetch(src)
        const arrayBuffer = await response.arrayBuffer()
        const header = new Int32Array(arrayBuffer, 0, 31)

        // Verify magic number
        if (header[0] !== MAGIC) {
          console.log('src', src)
          throw new Error('Invalid DDS file format')
        }

        const height = header[3]
        const width = header[4]
        const pixelFormat = header[20]

        if (!(pixelFormat & DDPF_FOURCC)) {
          throw new Error('Unsupported DDS format: not compressed')
        }

        const fourCC = header[21]
        const blockSize = 8

        if (fourCC !== FOURCC_DXT1) {
          throw new Error('Unsupported DDS format: not DXT1')
        }

        const size =
          (((Math.max(4, width) / 4) * Math.max(4, height)) / 4) * blockSize

        bytes = new Uint8Array(arrayBuffer, 128, size)
      } else if (isKtx) {
        const response = await fetch(src)
        const arrayBuffer = await response.arrayBuffer()

        const idCheck = [
          0xab, 0x4b, 0x54, 0x58, 0x20, 0x31, 0x31, 0xbb, 0x0d, 0x0a, 0x1a,
          0x0a,
        ]
        const id = new Uint8Array(arrayBuffer, 0, 12)
        for (let i = 0; i < id.length; i++)
          if (id[i] !== idCheck[i])
            return console.error('File missing KTX identifier')

        const size = Uint32Array.BYTES_PER_ELEMENT
        const head = new DataView(arrayBuffer, 12, 13 * size)
        const littleEndian = head.getUint32(0, true) === 0x04030201
        const glType = head.getUint32(size, littleEndian)
        if (glType !== 0) {
          throw new Error('only compressed formats currently supported')
        }
        const bytesOfKeyValueData = head.getUint32(12 * size, littleEndian)

        let offset = 12 + 13 * 4 + bytesOfKeyValueData
        const levelSize = new Int32Array(arrayBuffer, offset, 1)[0]
        offset += 4
        bytes = new Uint8Array(arrayBuffer, offset, levelSize)
      } else {
        async function loadImage(src) {
          return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              resolve(img)
            }
            img.onerror = () => {
              reject(new Error('Failed to load image'))
            }
            img.src = src
          })
        }
        bytes = await loadImage(src)
      }
    } catch (error) {
      console.error('Error loading media layer:', error)
      if (type !== 'compressed-grid') {
        const canvas = document.createElement('canvas')
        canvas.width = config.tileWidth ?? 1
        canvas.height = config.tileHeight ?? 1
        bytes = canvas
      } else {
        this.sharedLoadedMediaVersionLayersData[versionIndex].data[layerIndex] =
          0
        this.loadingMediaLayers--
        this.checkFinish()
        return
      }
    }

    this.loadedIndex++
    this.dispatchEvent(
      new LoaderEvent('mediaLayerLoaded', {
        bytes,
        versionIndex,
        layerIndex,
        type,
        isCompressed: isDds,
      }),
    )

    this.sharedLoadedMediaVersionLayersData[versionIndex].data[layerIndex] = 2
    onLoad?.()
    this.loadingMediaLayers--
    this.checkFinish()
  }

  checkFinish() {
    if (this.loadingMediaLayers === 0) {
      this.dispatchEvent(new LoaderEvent('idle'))
    }
  }

  requestMediaLayerLoad(versionIndex, layers) {
    layers.forEach((layerIndex) => {
      if (
        this.sharedLoadedMediaVersionLayersData[versionIndex].data[
          layerIndex
        ] === 0
      ) {
        void this.loadMediaLayer(versionIndex, layerIndex)
      }
    })
  }

  load(src, onLoad) {
    let mediaElement
    let loadEventName
    if (src.endsWith('.mp4')) {
      loadEventName = 'onplay'
      mediaElement = document.createElement('video')
      mediaElement.autoplay = true
      mediaElement.loop = true
      mediaElement.muted = true
      mediaElement.playsInline = true
      mediaElement.crossOrigin = 'anonymous'
      mediaElement.src = src
      void mediaElement.play()
    } else {
      loadEventName = 'onload'
      mediaElement = new Image()
      mediaElement.src = src
      mediaElement.crossOrigin = 'anonymous'
    }

    mediaElement[loadEventName] = () => {
      this.dispatchEvent(new LoaderEvent('loaded', mediaElement))
      onLoad?.(mediaElement)
    }
  }

  dispose() {}
}
