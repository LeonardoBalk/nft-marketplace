import { z } from 'zod'

export const favoritesSchema = z.object({
  nftIds: z.array(z.string().min(1)),
})

export type FavoritesResponse = z.infer<typeof favoritesSchema>

// página da lista de favoritos na url: refresh e voltar do navegador mantêm onde a pessoa estava
export const favoritesSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
})
