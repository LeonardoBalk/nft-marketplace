import { defaultCatalogSearch, type CatalogSearch } from './contracts'

// a última consulta do catálogo: quem abre um nft e volta encontra a mesma busca
let lastSearch: CatalogSearch = defaultCatalogSearch

export function rememberCatalogSearch(search: CatalogSearch): void {
  lastSearch = search
}

export function lastCatalogSearch(): CatalogSearch {
  return lastSearch
}
