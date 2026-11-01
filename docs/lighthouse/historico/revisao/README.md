# Medição Lighthouse de revisão

Fizemos a medição local em 31/10/2026, com o *build* otimizado de prévia e os *mocks* ativos. Foram três execuções para cada página e perfil. O ambiente usou Windows 11 Pro 10.0.26200, Node 22.18.0, npm 11.6.2, Lighthouse 12.6.1 e LHCI 0.15.1. As configurações estão em `lighthouse/desktop.json` e `lighthouse/mobile.json`. Os relatórios HTML e JSON de cada execução estão nas subpastas.

| Página / perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP mediano | CLS mediano | TBT mediano |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início desktop | 99 | 97 | 96 | 100 | 860 ms | 0,0012 | 2 ms |
| Detalhe desktop | 99 | 100 | 96 | 100 | 874 ms | 0,0081 | 0 ms |
| Início mobile | 59 | 100 | 96 | 100 | 6566 ms | 0,0026 | 219 ms |
| Detalhe mobile | 65 | 100 | 96 | 100 | 5625 ms | 0,0259 | 0 ms |

O desempenho *mobile* ficou abaixo da meta de 90. O LCP é alto e, no início, também houve bloqueio na execução de JavaScript. A divisão de rotas diminuiu o *bundle* principal, mas não foi suficiente para atingir a meta. As medições são preliminares porque alguns comandos locais rodaram durante a coleta e o código mudou depois do *build* auditado. Por isso, é preciso repetir a auditoria em um ambiente ocioso, com o *build* exato da entrega. Estes números não comprovam o resultado final.
