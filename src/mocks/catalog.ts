import type { CatalogFacets, CatalogSearch, NftNetwork, NftPage, NftSummary } from '../features/catalog/contracts'
import { ethToWei } from '../shared/money/eth'

const initialNfts: NftSummary[] = [
  { id: 'emerald-ape-042', name: 'Emerald Ape #042', collection: 'Kurio Apes', category: 'Colecionáveis', network: 'ethereum', artwork: '/artwork/emerald-ape.png', priceEth: '1.19', available: 50, edition: 100, version: 1 },
  { id: 'sage-nomad-009', name: 'Sage Nomad #009', collection: 'Kurio Apes', category: 'Arte digital', network: 'polygon', artwork: '/artwork/cosmic-bloom.png', priceEth: '1.69', available: 12, edition: 50, version: 1 },
  { id: 'neon-vessel-552', name: 'Neon Vessel #552', collection: 'Kurio Apes', category: 'Arte 3D', network: 'solana', artwork: '/artwork/neon-vessel.png', priceEth: '1.99', oldPriceEth: '2.29', available: 8, edition: 25, version: 1 },
  { id: 'cosmic-bloom-118', name: 'Cosmic Bloom #118', collection: 'Kurio Apes', category: 'Arte digital', network: 'ethereum', artwork: '/artwork/cosmic-bloom.png', priceEth: '1.29', available: 22, edition: 100, version: 1 },
  { id: 'violet-nomad-314', name: 'Violet Nomad #314', collection: 'Kurio Apes', category: 'Fotografia', network: 'polygon', artwork: '/artwork/cosmic-bloom.png', priceEth: '1.39', available: 14, edition: 50, version: 1 },
  { id: 'ivory-baron-088', name: 'Ivory Baron #088', collection: 'Kurio Apes', category: 'Arte 3D', network: 'solana', artwork: '/artwork/neon-vessel.png', priceEth: '1.79', available: 7, edition: 25, version: 1 },
  { id: 'golden-beat-207', name: 'Golden Beat #207', collection: 'Kurio Apes', category: 'Música', network: 'ethereum', artwork: '/artwork/golden-beat.png', priceEth: '0.99', available: 35, edition: 100, version: 1 },
  { id: 'golden-signal-160', name: 'Golden Signal #160', collection: 'Kurio Apes', category: 'Generativa', network: 'polygon', artwork: '/artwork/golden-beat.png', priceEth: '0.39', available: 48, edition: 100, version: 1 },
  { id: 'golden-wave-411', name: 'Golden Wave #411', collection: 'Kurio Apes', category: 'Jogos', network: 'solana', artwork: '/artwork/golden-beat.png', priceEth: '0.69', available: 30, edition: 100, version: 1 },
  { id: 'emerald-ape-043', name: 'Emerald Ape #043', collection: 'Kurio Apes', category: 'Colecionáveis', network: 'ethereum', artwork: '/artwork/emerald-ape.png', priceEth: '1.49', available: 18, edition: 100, version: 1 },
  { id: 'sage-nomad-010', name: 'Sage Nomad #010', collection: 'Kurio Apes', category: 'Assinaturas', network: 'polygon', artwork: '/artwork/cosmic-bloom.png', priceEth: '0.89', available: 20, edition: 50, version: 1 },
  { id: 'neon-vessel-553', name: 'Neon Vessel #553', collection: 'Kurio Apes', category: 'Utilidade', network: 'solana', artwork: '/artwork/neon-vessel.png', priceEth: '2.19', available: 6, edition: 25, version: 1 },
  { id: 'emerald-ape-044', name: 'Emerald Ape #044', collection: 'Kurio Apes', category: 'Colecionáveis', network: 'ethereum', artwork: '/artwork/emerald-ape.png', priceEth: '1.59', available: 16, edition: 100, version: 1 },
  { id: 'sage-nomad-011', name: 'Sage Nomad #011', collection: 'Kurio Apes', category: 'Arte digital', network: 'polygon', artwork: '/artwork/cosmic-bloom.png', priceEth: '1.09', available: 24, edition: 50, version: 1 },
  { id: 'ivory-baron-089', name: 'Ivory Baron #089', collection: 'Kurio Apes', category: 'Fotografia', network: 'ethereum', artwork: '/artwork/neon-vessel.png', priceEth: '1.49', available: 11, edition: 50, version: 1 },
  { id: 'neon-vessel-556', name: 'Neon Vessel #556', collection: 'Kurio Apes', category: 'Arte 3D', network: 'solana', artwork: '/artwork/neon-vessel.png', priceEth: '2.09', available: 9, edition: 25, version: 1 },
]

const extraArtwork = [
  '/artwork/emerald-ape.png',
  '/artwork/cosmic-bloom.png',
  '/artwork/neon-vessel.png',
  '/artwork/golden-beat.png',
]
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
const extraNames = ['Aurora', 'Orbit', 'Velvet', 'Pixel', 'Nova', 'Echo']
const extraPrices = ['0.59', '0.79', '0.89', '1.09', '1.29', '1.49', '1.69', '1.89']
const generatedCategories = [...remainingCategories, ...unlistedCategoryItems]
const generatedNfts: NftSummary[] = generatedCategories.map((category, index) => {
  const number = String(554 + index).padStart(3, '0')
  return {
    id: `kurio-edition-${number}`,
    name: `${extraNames[index % extraNames.length]} ${['Muse', 'Signal', 'Dream', 'Echo'][index % 4]} #${number}`,
    collection: `${['Kurio', 'Studio', 'Genesis'][index % 3]} Editions`,
    category,
    network: remainingNetworks[index],
    artwork: extraArtwork[index % extraArtwork.length],
    priceEth: extraPrices[index % extraPrices.length],
    available: 5 + (index % 41),
    edition: [25, 50, 100][index % 3],
    version: 1,
  }
})

const nfts = [...initialNfts, ...generatedNfts].map((nft) => ({ ...nft }))
const pageSize = 9
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
    (!search.category || nft.category === search.category) &&
    (!search.network || nft.network === search.network) &&
    (!search.minPrice || ethToWei(nft.priceEth) >= ethToWei(search.minPrice)) &&
    (!search.maxPrice || ethToWei(nft.priceEth) <= ethToWei(search.maxPrice)),
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
  return { ...nft }
}
