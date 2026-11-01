# Lighthouse do build revisado

Fizemos a coleta em 31/10/2026, com o *build* otimizado e os *mocks* habilitados. Foram três medições de cada página em cada perfil, sem testes em paralelo. O ambiente usou Windows 11 Pro 10.0.26200, Node 22.18.0, npm 11.6.2, Lighthouse 12.6.1 e LHCI 0.15.1. As configurações estão em `lighthouse/desktop.json` e `lighthouse/mobile.json`. As subpastas contêm os 12 relatórios HTML e os 12 JSON.

| Página e perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP mediano | CLS mediano | TBT mediano |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início desktop | 99 | 97 | 96 | 100 | 849 ms | 0,0012 | 0 ms |
| Detalhe desktop | 99 | 100 | 96 | 100 | 889 ms | 0,0081 | 0 ms |
| Início mobile | 52 | 100 | 96 | 100 | 7394 ms | 0,0026 | 375 ms |
| Detalhe mobile | 54 | 100 | 96 | 100 | 10424 ms | 0,0259 | 375 ms |

A performance *mobile* ficou abaixo da meta de 90. O Lighthouse aponta demora para descobrir e renderizar a imagem principal, além da execução de JavaScript na inicialização. O *build* ainda produz um *chunk* acima de 500 kB. A separação das rotas reduziu parte do JavaScript inicial, mas não resolveu o problema. Os resultados variaram bastante entre as execuções. Antes da entrega, é preciso repetir a auditoria em uma máquina ou CI de referência e investigar o carregamento do MSW, o JavaScript inicial e a descoberta das imagens.
