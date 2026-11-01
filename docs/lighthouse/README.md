# Auditoria Lighthouse

## Reavaliação após as correções de busca e carteiras

Depois, uma rodada com o painel de demonstração carregado sob demanda registrou performance mobile de 86 no início e 90 no detalhe. As notas foram 86, 86 e 87 no início, e 90 nas três medições do detalhe. O LCP mediano foi 3760 ms e 3312 ms; o TBT foi 126 ms e 93 ms, e o CLS foi 0 em ambas as páginas. Os relatórios estão em [`reavaliacao/painel-sob-demanda`](./reavaliacao/painel-sob-demanda/). O índice de velocidade da máquina variou entre as rodadas, por isso a diferença não comprova o efeito isolado da mudança.

Uma nova rodada local, com três medições por página no perfil mobile, não repetiu os resultados da tabela abaixo. A mediana de performance foi 80 no início e 89 no detalhe. O LCP mediano foi 4066 ms no início e 3310 ms no detalhe; o CLS mediano foi 0 nas duas páginas, e o TBT mediano foi 217 ms e 98 ms, respectivamente. As três notas individuais foram 80, 80 e 82 no início, e 84, 90 e 89 no detalhe. Os relatórios desta rodada estão em [`reavaliacao/mobile`](./reavaliacao/mobile/).

No desktop, as três medições de cada página atingiram 100 em performance. O LCP mediano foi 692 ms no início e 405 ms no detalhe; CLS e TBT foram 0 em ambos. Os relatórios estão em [`reavaliacao/desktop`](./reavaliacao/desktop/). As demais categorias passaram nas metas configuradas.

A tabela seguinte registra a rodada anterior e o *build* correspondente. Ela não comprova a performance do código atual. As duas rodadas usam limitação simulada; ainda é necessário investigar a diferença e repetir a auditoria na versão publicada com as correções atuais.

As medições usam o build pré-renderizado servido pelo `vite preview`, com os mocks ativos. Fiz três execuções por página e perfil, uma de cada vez. Os arquivos HTML e JSON estão em [`final/desktop`](./final/desktop/) e [`final/mobile`](./final/mobile/). O `manifest.json` de cada pasta aponta para as execuções desta rodada. As medições anteriores ficam em [`historico`](./historico/).

## Resultados

Os valores abaixo são as medianas das três execuções. LCP e TBT estão em milissegundos.

| Página e perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início desktop | 100 | 97 | 96 | 100 | 436 ms | 0 | 0 ms |
| Detalhe desktop | 100 | 100 | 96 | 100 | 417 ms | 0 | 0 ms |
| Início mobile | 100 | 100 | 96 | 100 | 1889 ms | 0 | 41 ms |
| Detalhe mobile | 100 | 100 | 96 | 100 | 1666 ms | 0 | 33 ms |

O HTML pré-renderizado pinta antes da inicialização de React e MSW. A mudança reduziu o LCP mobile mediano, que era 4167 ms no início e 3942 ms no detalhe na rodada anterior. Os botões que dependem de JavaScript só ficam visíveis depois da hidratação. Os testes E2E verificam o primeiro clique, mas a auditoria Lighthouse por si só mede carregamento, não a experiência de uso completa.

## Ambiente

- Windows 11 Pro 10.0.26200, Node 22.18.0, npm 11.6.2, Lighthouse 12.6.1, LHCI 0.15.1 e Chrome Headless 156.
- Build otimizado servido em `http://127.0.0.1:5175`, com três execuções por página e perfil. O perfil mobile usa *throttling* simulado, viewport de 390 × 844 e escala 3. A configuração está em [`lighthouse/mobile.json`](../../lighthouse/mobile.json) e [`lighthouse/desktop.json`](../../lighthouse/desktop.json).
- SHA-256 de `dist/index.html`: `4ba14b45411aec809c8f825313a932f7654457091588d9c986b8c61979a97330`.
- SHA-256 de `dist/nft/emerald-ape-042/index.html`: `e3239de17c3bd67a49ba72f5e226489a51e8c7e1fd765d012d5eded703fcf2bd`.

Esses resultados são locais. Falta repetir a auditoria no ambiente publicado, em [kurio-nft-mktplace.vercel.app](https://kurio-nft-mktplace.vercel.app/). A comparação com os frames do Figma também depende de acesso ao arquivo de design.
