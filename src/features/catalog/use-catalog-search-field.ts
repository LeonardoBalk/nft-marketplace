import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { catalogSearchSchema } from './contracts'
import { lastCatalogSearch } from './last-search'

const debounceMs = 350

// um campo de busca só para header e mobile: aplica enquanto digita, o enter leva aos resultados
export function useCatalogSearchField() {
  const navigate = useNavigate()
  const onCatalog = useRouterState({ select: (state) => state.location.pathname === '/' })
  const locationSearch = useRouterState({ select: (state) => state.location.search })
  // fora do catálogo a referência é a última busca feita nele, não a url da tela atual
  const committed = useMemo(() => (onCatalog ? catalogSearchSchema.parse(locationSearch) : lastCatalogSearch()), [onCatalog, locationSearch])
  const [value, setValue] = useState(committed.q)
  // só quem digitou dispara busca: o campo que apenas sincronizou com a url não navega
  const typed = useRef(false)

  // a url mudou por fora (voltar, limpar filtros, outro campo): o texto acompanha sem comer o espaço digitado
  useEffect(() => {
    setValue((current) => (current.trim() === committed.q ? current : committed.q))
  }, [committed.q])

  useEffect(() => {
    const query = value.trim().slice(0, 80)
    if (!typed.current || query === committed.q) return
    const timer = window.setTimeout(() => {
      typed.current = false
      // dentro do catálogo troca a url sem empilhar histórico; vindo de outra tela, abre o catálogo no topo
      void navigate({ to: '/', search: { ...committed, q: query, page: 1 }, replace: onCatalog, resetScroll: !onCatalog })
    }, debounceMs)
    return () => window.clearTimeout(timer)
  }, [value, committed, onCatalog, navigate])

  const change = (next: string) => {
    typed.current = true
    setValue(next)
  }

  const submit = () => {
    typed.current = false
    void navigate({ to: '/', search: { ...committed, q: value.trim().slice(0, 80), page: 1 }, replace: onCatalog, hash: 'catalogo' })
  }

  const clear = () => change('')

  return { value, change, submit, clear }
}
