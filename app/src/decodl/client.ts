// All known Decodl domains — tried in order, fallback on network/gateway failure.
// decodl.net geo-blocks some regions (returns 403 HTML), so it goes last.
const DECODL_DOMAINS = [
  'https://decodl.ir',
  'https://decodlbot.ir',
  'https://decodl.net',
]

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-app-key': process.env.DECODL_APP_KEY!,
    'authorization': `Bearer ${process.env.DECODL_TOKEN!}`,
  }
}

// Internal option names that are StockMart-specific and must never be sent to Decodl.
const INTERNAL_OPTION_NAMES = new Set(['isBulk', 'batchId', 'batchIndex', 'batchTotal'])

function filterOptions(options?: Array<{ name: string; value: string }>) {
  if (!options || options.length === 0) return undefined
  const filtered = options.filter(o => !INTERNAL_OPTION_NAMES.has(o.name))
  return filtered.length > 0 ? filtered : undefined
}

// Tries path (relative to domain) on each domain in order.
// Falls back to the next domain on infrastructure failures.
// Throws the last infrastructure error if all domains fail.
// Returns { response, data } where data is already parsed JSON.
async function fetchWithFallback(
  pathFn: (domain: string) => string,
  init: RequestInit,
): Promise<{ response: Response; data: any }> {
  let lastError: any = null

  for (const domain of DECODL_DOMAINS) {
    const url = pathFn(domain)
    let response: Response
    let data: any

    try {
      response = await fetch(url, init)
    } catch (networkErr) {
      // Network-level failure (DNS, ECONNREFUSED, timeout) — try next domain
      console.warn(`[Decodl] Network error on ${domain}:`, networkErr)
      lastError = networkErr
      continue
    }

    try {
      const text = await response.text()
      data = JSON.parse(text)
    } catch {
      // Non-JSON body (HTML error page) — try next domain
      console.warn(`[Decodl] Non-JSON response from ${domain} (HTTP ${response.status})`)
      lastError = Object.assign(
        new Error(`Provider API unavailable (HTTP ${response.status}). Retrying...`),
        { statusCode: response.status, code: 'gateway-error' }
      )
      continue
    }

    // 5xx from any domain means infrastructure failure — try next
    if (response.status >= 500) {
      console.warn(`[Decodl] 5xx from ${domain} (HTTP ${response.status})`)
      lastError = Object.assign(
        new Error(data?.message || `Server error (HTTP ${response.status})`),
        { statusCode: response.status, code: 'server-error' }
      )
      continue
    }

    // Got a real response (2xx or 4xx) — stop here, this domain is working
    console.log(`[Decodl] Success via ${domain} (HTTP ${response.status})`)
    return { response, data }
  }

  // All domains failed — surface the last error
  throw lastError ?? new Error('All provider API endpoints are currently unreachable. Please try again in a few minutes.')
}

export function scrubDecodlBrand(message: string): string {
  if (!message) return message;
  
  return message
    .replace(/@decodl_support/gi, '@stockmart_support')
    .replace(/decodlbot\.ir/gi, 'stockmart.lk')
    .replace(/decodl\.net/gi, 'stockmart.lk')
    .replace(/decodl\.ir/gi, 'stockmart.lk')
    .replace(/decodlbot/gi, 'StockMart')
    .replace(/decodl/gi, 'StockMart')
    .replace(/09399417568/gi, '+94772503124')
    .replace(/telegram number/gi, 'WhatsApp')
    .replace(/telegram/gi, 'WhatsApp')
    .replace(/purchase a package/gi, 'top up your credits at stockmart.lk/pricing')
    .replace(/purchase/gi, 'top up credits');
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

// magnific_video is code-only (isCodeNumberOnly:true) — extract trailing numeric ID from URL
// e.g. magnific.com/free-video/some-description_2891234#... → "2891234"
function extractMagnificVideoCode(link: string): string | undefined {
  const match = link.match(/_(\d+)(?:[#?]|$)/)
  return match ? match[1] : undefined
}

export async function submitDecodlDownload(params: DecodlSubmitParams): Promise<DecodlSubmitResult> {
  const body: Record<string, any> = {}

  if (params.providerName === 'magnific_video' || params.link?.includes('magnific.com/free-video')) {
    const code = params.code || (params.link ? extractMagnificVideoCode(params.link) : undefined)
    body.code = code
    body.providerName = 'magnific_video'
  } else if (params.providerName === 'lorempicsum' || params.link?.includes('picsum') || params.link?.includes('lorempicsum')) {
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

  const cleanOptions = filterOptions(params.options)
  if (cleanOptions) {
    body.options = cleanOptions
  }

  const { response, data } = await fetchWithFallback(
    (domain) => `${domain}/api/product/dev`,
    { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) },
  )

  if (!response.ok) {
    const code = data.code
    const message = data.message || 'Download request failed'
    throw Object.assign(new Error(scrubDecodlBrand(message)), { statusCode: response.status, code })
  }

  return { jobId: data.jobId }
}

// Decodl status check — the status endpoint is GET /api/job/dev/:jobId
export async function checkDecodlJobStatus(jobId: string): Promise<DecodlStatusResult> {
  const { response, data } = await fetchWithFallback(
    (domain) => `${domain}/api/job/dev/${jobId}`,
    { method: 'GET', headers: getHeaders() },
  )

  if (response.status === 404) {
    return { status: 'failed', errorMessage: 'Job not found', errorCode: 404024 }
  }

  if (!response.ok) {
    throw Object.assign(new Error(data.message || 'Status check failed'), { statusCode: response.status })
  }

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
  { pattern: /magnific\.com\/(free-video|premium-video)/, slug: 'magnific_video' },
  { pattern: /magnific\.com/, slug: 'magnific' },
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
  options?: Array<{ name: string; values: string[]; defaultValue?: string }>
}

export async function getDecodlAssetInfo(params: DecodlSubmitParams): Promise<DecodlAssetInfoResult> {
  const body: Record<string, any> = {}

  if (params.providerName === 'magnific_video' || params.link?.includes('magnific.com/free-video')) {
    const code = params.code || (params.link ? extractMagnificVideoCode(params.link) : undefined)
    body.code = code
    body.providerName = 'magnific_video'
  } else if (params.providerName === 'lorempicsum' || params.link?.includes('picsum') || params.link?.includes('lorempicsum')) {
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

  const cleanOpts = filterOptions(params.options)
  if (cleanOpts) {
    body.options = cleanOpts
  }

  const { response, data } = await fetchWithFallback(
    (domain) => `${domain}/api/product/dev/info`,
    { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) },
  )

  if (!response.ok) {
    const code = data.code
    const exceptionCode = data.data?.exceptionCode
    const message = scrubDecodlBrand(data.message || 'Asset info retrieval failed')
    throw Object.assign(new Error(message), { statusCode: response.status, code, exceptionCode })
  }

  // Picsum sandbox mock responses to simulate standard image formats
  if (body.providerName === 'lorempicsum' && (body.code === '1080319026' || body.code === '1080319027' || body.code === '1080319028')) {
    return {
      ratio: 1.0,
      options: []
    }
  }

  // Normalize options: API can return either {values: string[]} or {items: [{name,value}]}
  const rawOptions: any[] = Array.isArray(data.options) ? data.options : [];
  const normalizedOptions = rawOptions
    .map((opt: any) => ({
      name: opt.name,
      defaultValue: opt.defaultValue,
      values: Array.isArray(opt.values)
        ? opt.values
        : Array.isArray(opt.items)
          ? opt.items.map((item: any) => item.value ?? item.name)
          : [],
    }))
    .filter((opt) => opt.values.length > 0);

  return {
    ratio: typeof data.ratio === 'number' ? data.ratio : parseFloat(String(data.ratio)) || 1.0,
    options: normalizedOptions.length > 0 ? normalizedOptions : undefined,
  }
}
