import type { CatalogSearch } from './contracts'

export const catalogCategories = ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Colecionáveis', 'Generativa', 'Jogos', 'Assinaturas', 'Utilidade']

export const catalogNetworks = [
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'solana', label: 'Solana' },
] as const

export const catalogTabs = [
  { value: '', label: 'Todos os NFTs' },
  { value: 'novos', label: 'Novos lançamentos' },
  { value: 'em-alta', label: 'Em alta' },
] as const

// limites do slider de preço, em eth
export const priceBounds = { min: 0.02, max: 18, defaultMax: 12.3 } as const

// várias coleções viajam numa string só, separadas por vírgula: a url continua legível
export function selectedCategories(search: CatalogSearch): string[] {
  return search.category ? search.category.split(',').filter(Boolean) : []
}

// ordem do catálogo, não a do clique: a mesma seleção gera sempre a mesma url e a mesma chave de cache
export function toggleCategory(search: CatalogSearch, category: string): string {
  const current = selectedCategories(search)
  const next = current.includes(category) ? current.filter((entry) => entry !== category) : [...current, category]
  return catalogCategories.filter((entry) => next.includes(entry)).join(',')
}

// busca de texto não conta: ela tem o próprio campo e o próprio "limpar"
export function activeFilterCount(search: CatalogSearch): number {
  return selectedCategories(search).length + Number(Boolean(search.network)) + Number(Boolean(search.minPrice || search.maxPrice))
}
