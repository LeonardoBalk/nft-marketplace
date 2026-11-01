# Auditoria Lighthouse

Auditamos o início (`/`) e o detalhe do NFT (`/nft/emerald-ape-042`) nos perfis *desktop* e *mobile*. Fizemos três execuções por página e perfil. Os valores abaixo são a mediana das três. Os arquivos `*.html` e `*.json` desta pasta correspondem à execução mediana de cada página e perfil. Para gerar as demais, use `npm run audit:desktop` e `npm run audit:mobile`. Os arquivos saem em `lighthouse-report/`.

## Resultados (mediana de 3 execuções)

| Página | Perfil | Performance | Accessibility | Best Practices | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| Início | Desktop | **99** | **97** | **96** | **100** |
| Detalhe | Desktop | **99** | **100** | **96** | **100** |
| Início | Mobile | 69 | **100** | **96** | **100** |
| Detalhe | Mobile | 69 | **100** | **96** | **100** |

Em negrito, o que atinge a meta (Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90). As três execuções de cada linha variaram no máximo 3 pontos.

## Métricas (mediana)

| Página | Perfil | LCP | CLS | TBT | FCP |
| --- | --- | ---: | ---: | ---: | ---: |
| Início | Desktop | 0,84 s | 0,001 | 0 ms | 0,63 s |
| Detalhe | Desktop | 0,81 s | 0,008 | 0 ms | 0,61 s |
| Início | Mobile | 5,28 s | 0,003 | 23 ms | 4,82 s |
| Detalhe | Mobile | 5,05 s | 0,026 | 0 ms | 5,00 s |

CLS e TBT ficam baixos nos dois perfis. O ponto fraco é o tempo até a primeira pintura no *mobile*, que também aumenta o LCP.

## Ambiente e condições

- Lighthouse 12.6.1 via `@lhci/cli` 0.15.1, Chrome 156 headless, Node 22.18.0, Windows 11.
- Build de produção do Vite servido por `vite preview` local, com os mocks MSW ligados (cenário padrão), como na demonstração. Nenhuma imagem, fonte ou funcionalidade foi removida para a auditoria.
- Configuração versionada em [`lighthouse/desktop.json`](../../../../lighthouse/desktop.json) e [`lighthouse/mobile.json`](../../../../lighthouse/mobile.json).
- Desktop: preset `desktop`, throttling simulado (RTT 40 ms, 10 Mbps, CPU 1x).
- Mobile: tela 390×844 a 3x, preset `perf`, que aplica throttling **devtools**: RTT 150 ms, 1,6 Mbps, 562 ms de latência por requisição e CPU 4x mais lenta. É um perfil mais duro que o do PageSpeed (throttling simulado), porque a latência é imposta de fato a cada requisição em vez de estimada.

## Por que a performance mobile fica abaixo de 90

1. **Inicialização em série com o MSW.** O README exige os *mocks* ativos no *build* de demonstração. Por isso, o `main.tsx` só renderiza depois de `worker.start()`. A cadeia fica: HTML → JS principal (251 KB) → *chunk* do MSW (95 KB) → registro e ativação do *service worker* → primeira renderização. Com 562 ms de latência por requisição, essa sequência consome a maior parte dos ~4,8 s de FCP. Em produção, com uma API real, o MSW e o *service worker* saem da frente. A primeira pintura não espera por eles.
2. **JavaScript não usado (~170 KB).** As rotas vão em um único *bundle*. Carrinho, *checkout*, conta e pedido são baixados e avaliados já no início.
3. **Imagens.** `public/artwork/sage-nomad.png` tem 880 KB e responde por quase toda a economia de 819 KiB apontada em "formatos modernos". As demais artes já são WebP. Faltam variantes por tamanho (`srcset`) para os *cards* de 168–250 px.

## Outros apontamentos

- **Best Practices 96:** o console registra 401 em `/api/auth/session` para visitantes. É a resposta correta para quem não tem sessão, mas o navegador a registra como erro de recurso.
- **Accessibility 97 no início desktop:** o filtro de preço tem dois `input range` sobrepostos (as duas alças do mesmo trilho, como no Figma), e a auditoria de alvo de toque os considera próximos demais. O teclado e o leitor de tela tratam cada alça separadamente.
- **bf-cache:** o service worker do MSW impede a restauração pelo cache de voltar/avançar. O próprio Lighthouse classifica como não acionável, e isso só acontece no ambiente de mocks.

## Correções aplicadas nesta rodada

| Mudança | Efeito |
| --- | --- |
| `public/robots.txt` (antes, o servidor devolvia o `index.html`) | SEO de 92 para 100 |
| Pontos dos carrosséis a 24 px entre centros | Accessibility mobile de 97 para 100 |
| Primeiros cards do catálogo sem `loading="lazy"` e com `fetchpriority="high"` (eram o elemento LCP do mobile) | LCP mobile do início de 6,7 s para 5,3 s |
| `favicon.png` de 256 px/101 KB para 64 px/9 KB | Menos bytes na inicialização |

A performance *mobile* passou de 62 (início) e 58 (detalhe) para 69 nas duas páginas. A variação entre execuções caiu de até 21 pontos para no máximo 3.

## Próximos passos para chegar a 90 no mobile

1. Converter `sage-nomad.png` para WebP, como as outras artes, e gerar variantes com `srcset`.
2. Carregar as rotas sob demanda (`lazy` no TanStack Router), deixando no bundle inicial só o catálogo e o detalhe.
3. Baixar o chunk do MSW em paralelo ao JS principal (`modulepreload`) e pintar o esqueleto da página antes de `worker.start()` terminar.
