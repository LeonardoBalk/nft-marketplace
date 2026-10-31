import { z } from 'zod'
import type { CatalogFacets, CatalogSearch, NftNetwork, NftPage, NftRarity, NftSummary } from '../features/catalog/contracts'
import { ethToWei } from '../shared/money/eth'

type NftSeed = Omit<NftSummary, 'rating' | 'reviews' | 'rarity' | 'attributes'>

const initialNfts: NftSeed[] = [
  { id: 'emerald-ape-042', name: 'Emerald Ape #042', collection: 'Kurio Apes', category: 'Colecionáveis', network: 'ethereum', artwork: '/artwork/emerald-ape.webp', priceEth: '1.19', available: 50, edition: 100, version: 1 },
  { id: 'sage-nomad-009', name: 'Sage Nomad #009', collection: 'Kurio Apes', category: 'Arte digital', network: 'polygon', artwork: '/artwork/cosmic-bloom.webp', priceEth: '1.69', available: 12, edition: 50, version: 1 },
  { id: 'neon-vessel-552', name: 'Neon Vessel #552', collection: 'Kurio Apes', category: 'Arte 3D', network: 'solana', artwork: '/artwork/neon-vessel.webp', priceEth: '1.99', oldPriceEth: '2.29', available: 8, edition: 25, version: 1 },
  { id: 'cosmic-bloom-118', name: 'Cosmic Bloom #118', collection: 'Kurio Apes', category: 'Arte digital', network: 'ethereum', artwork: '/artwork/cosmic-bloom.webp', priceEth: '1.29', available: 22, edition: 100, version: 1 },
  { id: 'violet-nomad-314', name: 'Violet Nomad #314', collection: 'Kurio Apes', category: 'Fotografia', network: 'polygon', artwork: '/artwork/cosmic-bloom.webp', priceEth: '1.39', available: 14, edition: 50, version: 1 },
  { id: 'ivory-baron-088', name: 'Ivory Baron #088', collection: 'Kurio Apes', category: 'Arte 3D', network: 'solana', artwork: '/artwork/neon-vessel.webp', priceEth: '1.79', available: 7, edition: 25, version: 1 },
  { id: 'golden-beat-207', name: 'Golden Beat #207', collection: 'Kurio Apes', category: 'Música', network: 'ethereum', artwork: '/artwork/golden-beat.webp', priceEth: '0.99', available: 35, edition: 100, version: 1 },
  { id: 'golden-signal-160', name: 'Golden Signal #160', collection: 'Kurio Apes', category: 'Generativa', network: 'polygon', artwork: '/artwork/golden-beat.webp', priceEth: '0.39', available: 48, edition: 100, version: 1 },
  { id: 'golden-wave-411', name: 'Golden Wave #411', collection: 'Kurio Apes', category: 'Jogos', network: 'solana', artwork: '/artwork/golden-beat.webp', priceEth: '0.69', available: 30, edition: 100, version: 1 },
  { id: 'emerald-ape-043', name: 'Emerald Ape #043', collection: 'Kurio Apes', category: 'Colecionáveis', network: 'ethereum', artwork: '/artwork/emerald-ape.webp', priceEth: '1.49', available: 18, edition: 100, version: 1 },
  { id: 'sage-nomad-010', name: 'Sage Nomad #010', collection: 'Kurio Apes', category: 'Assinaturas', network: 'polygon', artwork: '/artwork/cosmic-bloom.webp', priceEth: '0.89', available: 20, edition: 50, version: 1 },
  { id: 'neon-vessel-553', name: 'Neon Vessel #553', collection: 'Kurio Apes', category: 'Utilidade', network: 'solana', artwork: '/artwork/neon-vessel.webp', priceEth: '2.19', available: 6, edition: 25, version: 1 },
  { id: 'emerald-ape-044', name: 'Emerald Ape #044', collection: 'Kurio Apes', category: 'Colecionáveis', network: 'ethereum', artwork: '/artwork/emerald-ape.webp', priceEth: '1.59', available: 16, edition: 100, version: 1 },
  { id: 'sage-nomad-011', name: 'Sage Nomad #011', collection: 'Kurio Apes', category: 'Arte digital', network: 'polygon', artwork: '/artwork/cosmic-bloom.webp', priceEth: '1.09', available: 24, edition: 50, version: 1 },
  { id: 'ivory-baron-089', name: 'Ivory Baron #089', collection: 'Kurio Apes', category: 'Fotografia', network: 'ethereum', artwork: '/artwork/neon-vessel.webp', priceEth: '1.49', available: 11, edition: 50, version: 1 },
  { id: 'neon-vessel-556', name: 'Neon Vessel #556', collection: 'Kurio Apes', category: 'Arte 3D', network: 'solana', artwork: '/artwork/neon-vessel.webp', priceEth: '2.09', available: 9, edition: 25, version: 1 },
]

const extraArtwork = [
  '/artwork/emerald-ape.webp',
  '/artwork/cosmic-bloom.webp',
  '/artwork/neon-vessel.webp',
  '/artwork/golden-beat.webp',
]
// avaliação e traços das peças que aparecem nos frames; o resto é derivado
const curatedTraits: Record<string, { rating: number; reviews: number; attributes: string[] }> = {
  'emerald-ape-042': { rating: 4.8, reviews: 19, attributes: ['Óculos', 'Esmeralda'] },
  'sage-nomad-009': { rating: 4.6, reviews: 32, attributes: ['Chapéu', 'Lavanda'] },
  'neon-vessel-552': { rating: 4.9, reviews: 54, attributes: ['Neon', 'Vidro'] },
  'cosmic-bloom-118': { rating: 4.5, reviews: 27, attributes: ['Flor', 'Nebulosa'] },
  'violet-nomad-314': { rating: 4.4, reviews: 11, attributes: ['Capuz', 'Violeta'] },
  'ivory-baron-088': { rating: 4.7, reviews: 63, attributes: ['Terno', 'Marfim'] },
  'golden-beat-207': { rating: 4.3, reviews: 48, attributes: ['Fones', 'Ouro'] },
}
const attributePool = ['Corrente', 'Jaqueta', 'Névoa', 'Âmbar', 'Holograma', 'Vinil', 'Cristal', 'Fumaça']
// só a menor tiragem é rara, como no frame (neon vessel sim, sage nomad não); o selo sai do dado
const rareEditionLimit = 25

function seedOf(id: string): number {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

function decorate(seed: NftSeed): NftSummary {
  const hash = seedOf(seed.id)
  const rarity: NftRarity = seed.edition <= rareEditionLimit ? 'RARO' : 'COMUM'
  const curated = curatedTraits[seed.id]
  const traits = curated?.attributes ?? [attributePool[hash % attributePool.length], attributePool[(hash >> 4) % attributePool.length]]
  return {
    ...seed,
    rating: curated?.rating ?? Number((4 + (hash % 11) / 10).toFixed(1)),
    reviews: curated?.reviews ?? 5 + (hash % 195),
    rarity,
    attributes: [...new Set([...traits, rarity === 'COMUM' ? 'Clássico' : 'Raro'])],
  }
}
const categoryCounts = [
  { name: 'Arte digital', count: 33 },
  { name: 'Fotografia', count: 12 },
  { name: 'Música', count: 65 },
  { name: 'Arte 3D', count: 39 },
  { name: 'Colecionáveis', count: 23 },
  { name: 'Generativa', count: 17 },
  { name: 'Jogos', count: 19 },
  { name: 'Assinaturas', count: 13 },
  { name: 'Utilidade', count: 18 },
]
const networkCounts: Array<{ value: NftNetwork; label: string; count: number }> = [
  { value: 'ethereum', label: 'Ethereum', count: 119 },
  { value: 'polygon', label: 'Polygon', count: 78 },
  { value: 'solana', label: 'Solana', count: 86 },
]
const initialCategoryCounts = new Map<string, number>()
for (const nft of initialNfts) initialCategoryCounts.set(nft.category, (initialCategoryCounts.get(nft.category) ?? 0) + 1)
const initialNetworkCounts = new Map<NftNetwork, number>()
for (const nft of initialNfts) initialNetworkCounts.set(nft.network, (initialNetworkCounts.get(nft.network) ?? 0) + 1)
const remainingCategories = categoryCounts.flatMap(({ name, count }) =>
  Array.from({ length: count - (initialCategoryCounts.get(name) ?? 0) }, () => name),
)
const unlistedCategoryItems = Array.from({ length: 44 }, () => 'Outros')
const remainingNetworks = networkCounts.flatMap(({ value, count }) =>
  Array.from({ length: count - (initialNetworkCounts.get(value) ?? 0) }, () => value),
)
// as duas listas saem em blocos; ler as redes com passo primo que não divide o total espalha
// cada coleção pelas três redes sem mudar quantas peças cada rede tem
const networkStride = [7, 11, 13, 17, 19, 23].find((step) => remainingNetworks.length % step !== 0) ?? 1
const extraNames = ['Aurora', 'Orbit', 'Velvet', 'Pixel', 'Nova', 'Echo']
const extraPrices = ['0.59', '0.79', '0.89', '1.09', '1.29', '1.49', '1.69', '1.89']
const generatedCategories = [...remainingCategories, ...unlistedCategoryItems]
const generatedNfts: NftSeed[] = generatedCategories.map((category, index) => {
  const number = String(554 + index).padStart(3, '0')
  return {
    id: `kurio-edition-${number}`,
    name: `${extraNames[index % extraNames.length]} ${['Muse', 'Signal', 'Dream', 'Echo'][index % 4]} #${number}`,
    collection: `${['Kurio', 'Studio', 'Genesis'][index % 3]} Editions`,
    category,
    network: remainingNetworks[(index * networkStride) % remainingNetworks.length],
    artwork: extraArtwork[index % extraArtwork.length],
    priceEth: extraPrices[index % extraPrices.length],
    available: 5 + (index % 41),
    edition: [25, 50, 100][index % 3],
    version: 1,
  }
})

const nfts: NftSummary[] = [...initialNfts, ...generatedNfts].map(decorate)
const catalogStoreKey = 'kurio.demo.catalog.v1'
const savedCatalogSchema = z.record(z.string(), z.object({
  priceEth: z.string().regex(/^\d+(?:\.\d{1,18})?$/),
  available: z.number().int().min(0),
  version: z.number().int().min(1),
}))

try {
  const raw = localStorage.getItem(catalogStoreKey)
  const saved = raw ? savedCatalogSchema.safeParse(JSON.parse(raw)) : null
  if (saved?.success) {
    for (const nft of nfts) {
      const state = saved.data[nft.id]
      if (state) Object.assign(nft, state)
    }
  }
} catch {
  localStorage.removeItem(catalogStoreKey)
}

function persistCatalog(): void {
  localStorage.setItem(catalogStoreKey, JSON.stringify(Object.fromEntries(nfts.map(({ id, priceEth, available, version }) => [id, { priceEth, available, version }]))))
}
const pageSize = 9

// a ordem do array já é a de listagem (é o que "listados recentemente" mostra): uma peça por dia
const newReleaseWindowDays = 21
const listedDaysAgo = new Map(nfts.map((nft, index) => [nft.id, index]))
// procura derivada de avaliações e do id: estável entre recargas, sem sorteio
const trendingCount = 27
const trendingIds = new Set(
  [...nfts]
    .sort((a, b) => (b.reviews * 3 + (seedOf(b.id) % 40)) - (a.reviews * 3 + (seedOf(a.id) % 40)))
    .slice(0, trendingCount)
    .map((nft) => nft.id),
)
const catalogFacets: CatalogFacets = {
  categories: categoryCounts.map(({ name }) => ({
    name,
    count: nfts.filter((nft) => nft.category === name).length,
  })),
  networks: networkCounts.map(({ value, label }) => ({
    value,
    label,
    count: nfts.filter((nft) => nft.network === value).length,
  })),
}

export function listNfts(search: CatalogSearch): NftPage {
  const query = search.q.toLocaleLowerCase('pt-BR')
  const filtered = nfts.filter((nft) =>
    (!query || `${nft.name} ${nft.collection}`.toLocaleLowerCase('pt-BR').includes(query)) &&
    (!search.category || search.category.split(',').includes(nft.category)) &&
    (!search.network || nft.network === search.network) &&
    (!search.minPrice || ethToWei(nft.priceEth) >= ethToWei(search.minPrice)) &&
    (!search.maxPrice || ethToWei(nft.priceEth) <= ethToWei(search.maxPrice)) &&
    (search.tab !== 'novos' || (listedDaysAgo.get(nft.id) ?? Infinity) < newReleaseWindowDays) &&
    (search.tab !== 'em-alta' || trendingIds.has(nft.id)),
  )

  if (search.sort === 'price-asc') filtered.sort((a, b) => ethToWei(a.priceEth) < ethToWei(b.priceEth) ? -1 : ethToWei(a.priceEth) > ethToWei(b.priceEth) ? 1 : 0)
  if (search.sort === 'price-desc') filtered.sort((a, b) => ethToWei(a.priceEth) > ethToWei(b.priceEth) ? -1 : ethToWei(a.priceEth) < ethToWei(b.priceEth) ? 1 : 0)

  return {
    items: filtered.slice((search.page - 1) * pageSize, search.page * pageSize).map((nft) => ({ ...nft })),
    total: filtered.length,
    page: search.page,
    pageSize,
    pageCount: Math.ceil(filtered.length / pageSize),
    facets: {
      categories: catalogFacets.categories.map((facet) => ({ ...facet })),
      networks: catalogFacets.networks.map((facet) => ({ ...facet })),
    },
  }
}

export function getRelatedNfts(nftId: string, limit = 15): NftSummary[] {
  const nft = nfts.find((entry) => entry.id === nftId)
  if (!nft) return []
  return nfts
    .filter((entry) => entry.id !== nft.id && entry.collection === nft.collection)
    .slice(0, limit)
    .map((entry) => ({ ...entry }))
}

export function getNft(nftId: string): NftSummary | null {
  const nft = nfts.find((entry) => entry.id === nftId)
  return nft ? { ...nft } : null
}

export function changeNftPrice(nftId: string, priceEth: string): NftSummary | null {
  const nft = nfts.find((entry) => entry.id === nftId)
  if (!nft) return null
  nft.priceEth = priceEth
  nft.version += 1
  persistCatalog()
  return { ...nft }
}
