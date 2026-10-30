import type { NftSummary } from '../features/catalog/contracts'

const initialNfts: NftSummary[] = [
  { id: 'emerald-ape-042', name: 'Emerald Ape #042', priceEth: '1.19', available: 50, version: 1 },
]

const nfts = initialNfts.map((nft) => ({ ...nft }))

export function listNfts(): NftSummary[] {
  return nfts.map((nft) => ({ ...nft }))
}

export function changeNftPrice(nftId: string, priceEth: string): NftSummary | null {
  const nft = nfts.find((entry) => entry.id === nftId)
  if (!nft) return null
  nft.priceEth = priceEth
  nft.version += 1
  return { ...nft }
}
