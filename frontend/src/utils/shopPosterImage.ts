const posterWidth = 1080
const posterHeight = 1350
const svgNamespace = 'http://www.w3.org/2000/svg'

function loadImage(source: string, allowFailure = false) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => {
      if (allowFailure) resolve(image)
      else reject(new Error('Could not prepare the poster QR code.'))
    }
    image.src = source
  })
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word
    if (line && context.measureText(nextLine).width > maxWidth) {
      lines.push(line)
      line = word
      if (lines.length === maxLines - 1) break
    } else {
      line = nextLine
    }
  }

  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    let lastLine = lines[maxLines - 1]
    while (lastLine && context.measureText(`${lastLine}…`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1)
    }
    lines[maxLines - 1] = `${lastLine.trimEnd()}…`
  }
  return lines
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const lines = wrapText(context, text, maxWidth, maxLines)
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight, maxWidth))
  return lines.length
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  const sourceX = (image.naturalWidth - sourceWidth) / 2
  const sourceY = (image.naturalHeight - sourceHeight) / 2
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
}

export async function createShopPosterImage({
  businessName,
  category,
  location,
  phone,
  storefrontUrl,
  qrSvg,
  products,
}: {
  businessName: string
  category: string
  location: string
  phone: string
  storefrontUrl: string
  qrSvg: SVGSVGElement
  products: { name: string; price: string; image?: string }[]
}) {
  const qrClone = qrSvg.cloneNode(true) as SVGSVGElement
  qrClone.setAttribute('xmlns', svgNamespace)
  qrClone.setAttribute('width', '320')
  qrClone.setAttribute('height', '320')
  const qrSource = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(qrClone))}`
  const [qrImage, productImages] = await Promise.all([
    loadImage(qrSource),
    Promise.all(products.map((product) => product.image ? loadImage(product.image, true) : Promise.resolve(null))),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = posterWidth
  canvas.height = posterHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Your browser could not create the poster image.')

  context.fillStyle = '#FFFDF8'
  context.fillRect(0, 0, posterWidth, posterHeight)

  const headerGradient = context.createLinearGradient(0, 0, posterWidth, 350)
  headerGradient.addColorStop(0, '#123D38')
  headerGradient.addColorStop(1, '#1B5A50')
  context.fillStyle = headerGradient
  context.fillRect(0, 0, posterWidth, 365)

  context.fillStyle = '#28665B'
  context.beginPath()
  context.arc(1010, 30, 190, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#E96D52'
  context.beginPath()
  context.arc(1010, 30, 112, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#E96D52'
  context.beginPath()
  context.roundRect(60, 48, 50, 50, 13)
  context.fill()
  context.fillStyle = '#FFFFFF'
  context.font = '700 32px Arial, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('O', 85, 73)
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillStyle = '#FFFDF8'
  context.font = '800 29px Arial, sans-serif'
  context.fillText('OFFlet', 126, 84)

  context.fillStyle = '#B8D7CD'
  context.font = '700 17px Arial, sans-serif'
  context.fillText('GOOD THINGS ARE CLOSER THAN YOU THINK', 62, 148)
  context.fillStyle = '#FFFDF8'
  let businessNameFontSize = 61
  context.font = `600 ${businessNameFontSize}px Georgia, serif`
  while (context.measureText(businessName).width > 940 && businessNameFontSize > 38) {
    businessNameFontSize -= 2
    context.font = `600 ${businessNameFontSize}px Georgia, serif`
  }
  const nameLines = drawWrappedText(context, businessName, 62, 235, 940, 68, 2)

  const categoryY = nameLines > 1 ? 320 : 292
  context.font = '700 17px Arial, sans-serif'
  const categoryWidth = Math.min(context.measureText(category).width + 42, 720)
  context.fillStyle = '#E6F0EA'
  context.beginPath()
  context.roundRect(62, categoryY, categoryWidth, 38, 19)
  context.fill()
  context.fillStyle = '#28675D'
  context.fillText(category, 82, categoryY + 25, categoryWidth - 36)

  if (location) {
    context.fillStyle = '#536A64'
    context.font = '500 17px Arial, sans-serif'
    context.fillText(location, 82 + categoryWidth, categoryY + 25, 900 - categoryWidth)
  }

  const productTop = 420
  context.fillStyle = '#B9503B'
  context.font = '800 16px Arial, sans-serif'
  context.fillText('A LITTLE LOOK INSIDE', 62, productTop)
  context.fillStyle = '#173B36'
  context.font = '600 30px Georgia, serif'
  context.fillText('From our shelves', 62, productTop + 42)

  const cardY = productTop + 65
  const cardHeight = 286
  const gap = 24
  const cardWidth = products.length === 1 ? 956 : 466
  const drawProduct = (product: { name: string; price: string }, image: HTMLImageElement | null, index: number) => {
    const x = 62 + index * (cardWidth + gap)
    context.fillStyle = '#F0F4F0'
    context.beginPath()
    context.roundRect(x, cardY, cardWidth, cardHeight, 22)
    context.fill()
    if (image?.complete && image.naturalWidth) {
      const imageWidth = products.length === 1 ? 330 : cardWidth
      const imageHeight = products.length === 1 ? cardHeight : 174
      const imageX = products.length === 1 ? x : x
      const imageY = products.length === 1 ? cardY : cardY
      context.save()
      context.beginPath()
      context.roundRect(imageX, imageY, imageWidth, imageHeight, 18)
      context.clip()
      drawImageCover(context, image, imageX, imageY, imageWidth, imageHeight)
      context.restore()
    } else {
      context.fillStyle = index === 0 ? '#DCEAE3' : '#F5E2D9'
      context.beginPath()
      context.roundRect(x + 12, cardY + 12, cardWidth - 24, products.length === 1 ? cardHeight - 24 : 150, 14)
      context.fill()
      context.fillStyle = '#B9503B'
      context.font = '600 36px Georgia, serif'
      context.textAlign = 'center'
      context.fillText(product.name.trim().charAt(0).toUpperCase(), x + cardWidth / 2, cardY + 93)
      context.textAlign = 'left'
    }

    const textX = products.length === 1 ? x + 365 : x + 18
    const textWidth = products.length === 1 ? cardWidth - 390 : cardWidth - 36
    const textY = products.length === 1 ? cardY + 78 : cardY + 216
    context.fillStyle = '#173B36'
    context.font = '700 21px Arial, sans-serif'
    drawWrappedText(context, product.name, textX, textY, textWidth, 27, 2)
    context.fillStyle = '#B9503B'
    context.font = '700 19px Arial, sans-serif'
    context.fillText(product.price, textX, textY + 58, textWidth)
  }

  if (products.length) {
    products.forEach((product, index) => drawProduct(product, productImages[index], index))
  } else {
    context.fillStyle = '#F0F4F0'
    context.beginPath()
    context.roundRect(62, cardY, 956, cardHeight, 22)
    context.fill()
    context.fillStyle = '#536A64'
    context.font = '500 21px Arial, sans-serif'
    context.fillText('Visit our OFFlet storefront to discover more.', 92, cardY + 64, 850)
  }

  const scanTop = 845
  context.fillStyle = '#123D38'
  context.beginPath()
  context.roundRect(62, scanTop, 956, 355, 26)
  context.fill()
  context.fillStyle = '#F3A58C'
  context.font = '800 16px Arial, sans-serif'
  context.fillText('COME ON IN', 94, scanTop + 52)
  context.fillStyle = '#FFFDF8'
  context.font = '600 35px Georgia, serif'
  context.fillText('Scan to explore our shop', 94, scanTop + 106, 570)
  context.fillStyle = '#B8D7CD'
  context.font = '500 19px Arial, sans-serif'
  context.fillText('Products, offers and all the details.', 94, scanTop + 146, 550)
  if (location) {
    context.fillStyle = '#FFFDF8'
    context.font = '500 17px Arial, sans-serif'
    drawWrappedText(context, location, 94, scanTop + 204, 530, 25, 2)
  }
  if (phone) {
    context.fillStyle = '#FFFDF8'
    context.font = '700 18px Arial, sans-serif'
    context.fillText(phone, 94, scanTop + 269, 530)
  }

  context.fillStyle = '#FFFFFF'
  context.beginPath()
  context.roundRect(704, scanTop + 25, 284, 300, 20)
  context.fill()
  context.drawImage(qrImage, 721, scanTop + 39, 250, 250)
  context.fillStyle = '#536A64'
  context.font = '800 14px Arial, sans-serif'
  context.textAlign = 'center'
  context.fillText('OPEN OUR STOREFRONT', 846, scanTop + 307)
  context.textAlign = 'left'

  context.strokeStyle = '#DCE5E0'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(62, 1250)
  context.lineTo(1018, 1250)
  context.stroke()
  context.fillStyle = '#173B36'
  context.font = '800 22px Arial, sans-serif'
  context.fillText('OFFlet', 62, 1300)
  context.fillStyle = '#61766F'
  context.font = '500 16px Arial, sans-serif'
  context.textAlign = 'right'
  context.fillText(new URL(storefrontUrl).host, 1018, 1300, 600)
  context.textAlign = 'left'

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Your browser could not export the poster image.'))
        return
      }
      resolve(new File([blob], 'offlet-shop-poster.png', { type: 'image/png' }))
    }, 'image/png')
  })
}
