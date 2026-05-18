import { type PrismaClient } from '@prisma/client'

export const seedProviderPricing = async (prisma: PrismaClient) => {
  console.log('Seeding ProviderPricing table...')

  const providers = [
    // Sandbox / Test (free, no credits deducted)
    { slug: 'lorempicsum', variant: 'normal', displayName: 'StockMart Sandbox (Free)', category: 'test', creditCost: 0, sortOrder: 0, websiteUrl: 'https://picsum.photos' },
    // Images - no options
    { slug: 'shutterstock', variant: 'normal', displayName: 'Shutterstock', category: 'image', creditCost: 1, sortOrder: 1, websiteUrl: 'https://shutterstock.com' },
    { slug: 'shutterstock', variant: 'offset', displayName: 'Shutterstock (Offset)', category: 'image', creditCost: 15, sortOrder: 2, websiteUrl: 'https://shutterstock.com' },
    { slug: 'shutterstock_vip', variant: 'normal', displayName: 'Shutterstock VIP', category: 'image', creditCost: 3, sortOrder: 3, websiteUrl: 'https://shutterstock.com' },
    { slug: 'shutterstock_vip', variant: 'offset', displayName: 'Shutterstock VIP (Offset)', category: 'image', creditCost: 15, sortOrder: 4, websiteUrl: 'https://shutterstock.com' },
    { slug: 'freepik', variant: 'normal', displayName: 'Freepik', category: 'image', creditCost: 0.5, sortOrder: 5, websiteUrl: 'https://freepik.com' },
    { slug: 'freepik', variant: 'magnific', displayName: 'Freepik (Magnific)', category: 'image', creditCost: 0.5, sortOrder: 6, websiteUrl: 'https://freepik.com' },
    { slug: 'adobestock', variant: 'normal', displayName: 'Adobe Stock', category: 'image', creditCost: 1, sortOrder: 7, websiteUrl: 'https://stock.adobe.com' },
    { slug: 'creative_fabrica', variant: 'normal', displayName: 'Creative Fabrica', category: 'image', creditCost: 1, sortOrder: 8, websiteUrl: 'https://creativefabrica.com' },
    { slug: 'vexels', variant: 'normal', displayName: 'Vexels', category: 'image', creditCost: 8, sortOrder: 9, websiteUrl: 'https://vexels.com' },
    { slug: 'vecteezy', variant: 'normal', displayName: 'Vecteezy', category: 'image', creditCost: 1, sortOrder: 10, websiteUrl: 'https://vecteezy.com' },
    { slug: 'vecteezy', variant: 'bundle', displayName: 'Vecteezy (Bundle)', category: 'image', creditCost: 60, sortOrder: 11, websiteUrl: 'https://vecteezy.com' },
    { slug: 'envato_elements', variant: 'normal', displayName: 'Envato Elements', category: 'image', creditCost: 1, sortOrder: 12, websiteUrl: 'https://elements.envato.com' },
    { slug: 'ui8', variant: 'normal', displayName: 'UI8', category: 'image', creditCost: 8, sortOrder: 13, websiteUrl: 'https://ui8.net' },
    { slug: 'rawpixel', variant: 'normal', displayName: 'Rawpixel', category: 'image', creditCost: 1, sortOrder: 14, websiteUrl: 'https://rawpixel.com' },
    { slug: 'pngtree', variant: 'normal', displayName: 'Pngtree', category: 'image', creditCost: 1, sortOrder: 15, websiteUrl: 'https://pngtree.com' },
    { slug: 'iconscout', variant: 'single', displayName: 'Iconscout (Single)', category: 'icon', creditCost: 1.5, sortOrder: 16, websiteUrl: 'https://iconscout.com' },
    { slug: 'iconscout', variant: 'pack', displayName: 'Iconscout (Pack each)', category: 'icon', creditCost: 1, sortOrder: 17, websiteUrl: 'https://iconscout.com' },
    { slug: 'flaticon', variant: 'animated', displayName: 'Flaticon (Animated)', category: 'icon', creditCost: 0.3, sortOrder: 18, websiteUrl: 'https://flaticon.com' },
    { slug: 'flaticon', variant: 'single', displayName: 'Flaticon (Single)', category: 'icon', creditCost: 0.2, sortOrder: 19, websiteUrl: 'https://flaticon.com' },
    { slug: 'flaticon', variant: 'pack', displayName: 'Flaticon (Pack each)', category: 'icon', creditCost: 0.1, sortOrder: 20, websiteUrl: 'https://flaticon.com' },
    { slug: 'yellowimages', variant: 'normal', displayName: 'Yellow Images', category: 'image', creditCost: 30, sortOrder: 21, websiteUrl: 'https://yellowimages.com' },
    { slug: 'motionarray', variant: 'normal', displayName: 'Motion Array', category: 'image', creditCost: 1, sortOrder: 22, websiteUrl: 'https://motionarray.com' },
    { slug: 'istockphoto', variant: 'normal', displayName: 'iStockphoto', category: 'image', creditCost: 1.5, sortOrder: 23, websiteUrl: 'https://istockphoto.com' },
    { slug: 'dreamstime', variant: 'normal', displayName: 'Dreamstime', category: 'image', creditCost: 1.5, sortOrder: 24, websiteUrl: 'https://dreamstime.com' },
    { slug: 'depositphotos', variant: 'normal', displayName: 'Depositphotos', category: 'image', creditCost: 1.5, sortOrder: 25, websiteUrl: 'https://depositphotos.com' },
    { slug: '123rf', variant: 'normal', displayName: '123RF', category: 'image', creditCost: 1.5, sortOrder: 26, websiteUrl: 'https://123rf.com' },
    { slug: 'alamy', variant: 'normal', displayName: 'Alamy', category: 'image', creditCost: 45, sortOrder: 27, websiteUrl: 'https://alamy.com' },
    { slug: 'vectorstock', variant: 'normal', displayName: 'VectorStock', category: 'image', creditCost: 5, sortOrder: 28, websiteUrl: 'https://vectorstock.com' },
    // Videos
    { slug: 'freepik_video', variant: 'normal', displayName: 'Freepik Video', category: 'video', creditCost: 3, requiresOptions: true, sortOrder: 29, websiteUrl: 'https://freepik.com', optionsConfig: { name: 'format', values: ['HD', '4K'] } },
    { slug: 'freepik_video', variant: 'magnific', displayName: 'Freepik Video (Magnific)', category: 'video', creditCost: 3, requiresOptions: true, sortOrder: 30, websiteUrl: 'https://freepik.com', optionsConfig: { name: 'format', values: ['HD', '4K'] } },
    { slug: 'shutterstock_video', variant: 'HD', displayName: 'Shutterstock Video HD', category: 'video', creditCost: 65, requiresOptions: true, sortOrder: 31, websiteUrl: 'https://shutterstock.com', optionsConfig: { name: 'format', values: ['HD', '4K'] } },
    { slug: 'shutterstock_video', variant: '4K', displayName: 'Shutterstock Video 4K', category: 'video', creditCost: 75, requiresOptions: true, sortOrder: 32, websiteUrl: 'https://shutterstock.com', optionsConfig: { name: 'format', values: ['HD', '4K'] } },
    { slug: 'shutterstock_video', variant: 'HD_select', displayName: 'Shutterstock Video HD Select', category: 'video', creditCost: 80, requiresOptions: true, sortOrder: 33, websiteUrl: 'https://shutterstock.com', optionsConfig: { name: 'format', values: ['HD', '4K'] } },
    { slug: 'shutterstock_video', variant: '4K_select', displayName: 'Shutterstock Video 4K Select', category: 'video', creditCost: 95, requiresOptions: true, sortOrder: 34, websiteUrl: 'https://shutterstock.com', optionsConfig: { name: 'format', values: ['HD', '4K'] } },
    { slug: 'istockphoto_video', variant: 'HD', displayName: 'iStock Video HD', category: 'video', creditCost: 55, requiresOptions: true, sortOrder: 35, websiteUrl: 'https://istockphoto.com', optionsConfig: { name: 'format', values: ['HD', '4K'] } },
    { slug: 'istockphoto_video', variant: '4K', displayName: 'iStock Video 4K', category: 'video', creditCost: 80, requiresOptions: true, sortOrder: 36, websiteUrl: 'https://istockphoto.com', optionsConfig: { name: 'format', values: ['HD', '4K'] } },
    { slug: 'adobestock_video', variant: 'HD', displayName: 'Adobe Stock Video HD', category: 'video', creditCost: 30, requiresOptions: true, sortOrder: 37, websiteUrl: 'https://stock.adobe.com', optionsConfig: { name: 'format', values: ['HD', '4K'] } },
    { slug: 'adobestock_video', variant: '4K', displayName: 'Adobe Stock Video 4K', category: 'video', creditCost: 70, requiresOptions: true, sortOrder: 38, websiteUrl: 'https://stock.adobe.com', optionsConfig: { name: 'format', values: ['HD', '4K'] } },
  ]

  for (const provider of providers) {
    await prisma.providerPricing.upsert({
      where: { slug_variant: { slug: provider.slug, variant: provider.variant } },
      update: provider,
      create: provider,
    })
  }

  console.log(`Seeded ${providers.length} provider pricing entries.`)
}
