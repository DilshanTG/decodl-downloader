const DECODL_BASE_URL = 'https://decodl.ir/api/product/dev'

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-app-key': process.env.DECODL_APP_KEY!,
    'authorization': `Bearer ${process.env.DECODL_TOKEN!}`,
  }
}

export function scrubDecodlBrand(message: string): string {
  if (!message) return message;
  
  return message
    .replace(/@decodl_support/gi, '@stockmart_support')
    .replace(/decodl\.net/gi, 'stockmart.lk')
    .replace(/decodl\.ir/gi, 'stockmart.lk')
    .replace(/decodl/gi, 'StockMart')
    .replace(/09399417568/gi, 'our support team')
    .replace(/telegram number/gi, 'telegram channel')
    .replace(/telegram/gi, 'support channels');
}

export type DecodlJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface DecodlSubmitResult {
  jobId: string
}

export interface DecodlStatusResult {
  status: DecodlJobStatus
  progress?: number
  downloadUrl?: string
  fileName?: string
  fileSize?: number
  thumbnailUrl?: string
  errorMessage?: string
  errorCode?: number
}

const ERROR_MAPPINGS: Record<string, string> = {
  'no-package': 'Your StockMart API account does not have an active package for this provider. Please purchase a Stock package directly on your dashboard (LKR balance must be converted to package stock).',
  'no-provider': 'The requested stock provider is temporarily experiencing server issues. Please try again later.',
  'not-found': 'The requested asset could not be found. Please check that the URL or code is correct and active on the provider site.',
  'not-supported': 'This specific asset or media type is not supported by StockMart at this time.',
  'error': 'The provider download system is currently unable to purchase this asset. Please try again in 5-10 minutes.'
};

export interface DecodlSubmitParams {
  link?: string
  code?: string
  providerName?: string
  options?: Array<{ name: string; value: string }>
}

export async function submitDecodlDownload(params: DecodlSubmitParams): Promise<DecodlSubmitResult> {
  const body: Record<string, any> = {}

  if (params.providerName === 'lorempicsum' || params.link?.includes('picsum') || params.link?.includes('lorempicsum')) {
    // For the test provider lorempicsum, Decodl API expects the code and providerName directly
    let code = params.code
    if (params.link) {
      const match = params.link.match(/\/id\/(\d+)/) || params.link.match(/\/(\d+)/)
      if (match) {
        code = match[1]
      } else {
        const numMatch = params.link.match(/\d+/)
        if (numMatch) code = numMatch[0]
      }
    }
    body.code = code || '1080319028'
    body.providerName = 'lorempicsum'
  } else if (params.link) {
    body.link = params.link
  } else {
    body.code = params.code
    body.providerName = params.providerName
  }

  if (params.options && params.options.length > 0) {
    body.options = params.options
  }

  const response = await fetch(DECODL_BASE_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })

  const data = await response.json() as any

  if (!response.ok) {
    const code = data.code
    const message = data.message || 'Download request failed'
    throw Object.assign(new Error(scrubDecodlBrand(message)), { statusCode: response.status, code })
  }

  return { jobId: data.jobId }
}

// Decodl status check — the status endpoint is GET /api/job/dev/:jobId
export async function checkDecodlJobStatus(jobId: string): Promise<DecodlStatusResult> {
  const statusUrl = `https://decodl.ir/api/job/dev/${jobId}`

  const response = await fetch(statusUrl, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (response.status === 404) {
    return { status: 'failed', errorMessage: 'Job not found', errorCode: 404024 }
  }

  if (!response.ok) {
    const data = await response.json() as any
    throw Object.assign(new Error(data.message || 'Status check failed'), { statusCode: response.status })
  }

  const data = await response.json() as any

  // 1. Handle failure and error responses
  const errorCode = data.errorCode || data.code;
  const rawError = data.error || (data.status === 'failed' ? data.message : null);

  if (rawError || errorCode) {
    let friendlyMessage = rawError || 'Download failed';
    const key = (errorCode || rawError || '').toString().toLowerCase();
    if (ERROR_MAPPINGS[key]) {
      friendlyMessage = ERROR_MAPPINGS[key];
    }
    return {
      status: 'failed',
      errorMessage: friendlyMessage,
      errorCode: typeof errorCode === 'number' ? errorCode : undefined,
    }
  }

  // 2. Handle success
  if (data.status === 'completed' || data.downloadLink || data.downloadUrl || data.link) {
    return {
      status: 'completed',
      downloadUrl: data.downloadLink || data.downloadUrl || data.link || data.url,
      fileName: data.fileName || data.file_name || data.name,
      fileSize: data.fileSize || data.file_size || data.size,
      thumbnailUrl: data.thumbnailUrl || data.thumbnail || data.preview,
    }
  }

  // 3. Handle progress
  if (data.progress !== undefined) {
    return {
      status: 'processing',
      progress: typeof data.progress === 'number' ? data.progress : parseInt(String(data.progress)) || 0,
    }
  }

  if (data.status === 'processing' || data.status === 'pending') {
    return { status: data.status || 'processing' }
  }

  return { status: 'processing' }
}

// URL pattern matching for auto-detecting provider from URL
const URL_PATTERNS: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /lorempicsum\.com|picsum\.photos/, slug: 'lorempicsum' },
  { pattern: /shutterstock\.com\/video/, slug: 'shutterstock_video' },
  { pattern: /shutterstock\.com/, slug: 'shutterstock' },
  { pattern: /stock\.adobe\.com\/video/, slug: 'adobestock_video' },
  { pattern: /stock\.adobe\.com/, slug: 'adobestock' },
  { pattern: /freepik\.com\/video/, slug: 'freepik_video' },
  { pattern: /freepik\.com/, slug: 'freepik' },
  { pattern: /flaticon\.com/, slug: 'flaticon' },
  { pattern: /alamy\.com/, slug: 'alamy' },
  { pattern: /depositphotos\.com/, slug: 'depositphotos' },
  { pattern: /dreamstime\.com/, slug: 'dreamstime' },
  { pattern: /elements\.envato\.com/, slug: 'envato_elements' },
  { pattern: /istockphoto\.com\/video/, slug: 'istockphoto_video' },
  { pattern: /istockphoto\.com/, slug: 'istockphoto' },
  { pattern: /123rf\.com/, slug: '123rf' },
  { pattern: /vecteezy\.com/, slug: 'vecteezy' },
  { pattern: /vectorstock\.com/, slug: 'vectorstock' },
  { pattern: /yellowimages\.com/, slug: 'yellowimages' },
  { pattern: /motionarray\.com/, slug: 'motionarray' },
  { pattern: /iconscout\.com/, slug: 'iconscout' },
  { pattern: /ui8\.net/, slug: 'ui8' },
  { pattern: /rawpixel\.com/, slug: 'rawpixel' },
  { pattern: /pngtree\.com/, slug: 'pngtree' },
  { pattern: /creativefabrica\.com/, slug: 'creative_fabrica' },
  { pattern: /vexels\.com/, slug: 'vexels' },
]

export function detectProviderFromUrl(url: string): string | null {
  for (const { pattern, slug } of URL_PATTERNS) {
    if (pattern.test(url)) return slug
  }
  return null
}

export interface DecodlAssetInfoResult {
  ratio: number
  options?: Array<{ name: string; values: string[] }>
}

export async function getDecodlAssetInfo(params: DecodlSubmitParams): Promise<DecodlAssetInfoResult> {
  const infoUrl = 'https://decodl.ir/api/product/dev/info'
  const body: Record<string, any> = {}

  if (params.providerName === 'lorempicsum' || params.link?.includes('picsum') || params.link?.includes('lorempicsum')) {
    let code = params.code
    if (params.link) {
      const match = params.link.match(/\/id\/(\d+)/) || params.link.match(/\/(\d+)/)
      code = match ? match[1] : undefined
    }
    body.code = code || '1080319028'
    body.providerName = 'lorempicsum'
  } else if (params.link) {
    body.link = params.link
  } else {
    body.code = params.code
    body.providerName = params.providerName
  }

  if (params.options && params.options.length > 0) {
    body.options = params.options
  }

  const response = await fetch(infoUrl, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })

  const data = await response.json() as any

  if (!response.ok) {
    const code = data.code
    const message = data.message || 'Asset info retrieval failed'
    throw Object.assign(new Error(message), { statusCode: response.status, code })
  }

  // Picsum sandbox mock responses to simulate standard image formats
  if (body.providerName === 'lorempicsum' && (body.code === '1080319026' || body.code === '1080319027' || body.code === '1080319028')) {
    return {
      ratio: 1.0,
      options: []
    }
  }

  return {
    ratio: typeof data.ratio === 'number' ? data.ratio : parseFloat(String(data.ratio)) || 1.0,
    options: data.options || undefined,
  }
}
