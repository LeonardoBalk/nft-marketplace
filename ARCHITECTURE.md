# Arquitetura da Kurio

### Visão geral

A aplicação é uma SPA em React e TypeScript. O TanStack Router controla a navegação e as URLs de busca. O TanStack Query cuida do estado remoto e do *cache*, enquanto o Axios concentra as chamadas REST. O MSW responde a essas chamadas no navegador e mantém os dados de demonstração. O Socket.IO Client recebe as atualizações simuladas por `@mswjs/socket.io-binding`. A camada visual usa Tailwind CSS e componentes shadcn/ui adaptados.

O *build* de demonstração ativa o MSW por padrão. A simulação roda no navegador e não tem um *backend* de produção. Ela não oferece persistência compartilhada entre dispositivos, transações financeiras, conexão com *blockchain* ou garantia de segurança de servidor.

### Responsabilidades

- `src/app`: páginas, layout e composição de componentes por rota
- `src/features/*/contracts.ts`: schemas Zod e tipos de domínio/transporte
- `src/features/*/queries.ts`: query keys, queries e mutations por domínio
- `src/shared/api/client.ts`: Axios, token Bearer, identificador de visitante e timeout HTTP
- `src/mocks/handlers.ts`: contratos REST e eventos de demonstração na camada de rede
- `src/mocks/*-store.ts`: estado simulado persistido em `localStorage`
- `src/shared/realtime/catalog-connection.ts`: conexão Socket.IO, filtros de versão e reconciliação
- `tests/e2e`: fluxos Playwright executados sobre o build de preview com MSW

As páginas não criam respostas fictícias para substituir chamadas. A interface consome os mesmos recursos REST utilizados pelos cenários E2E.

### Fluxo de dados

1. A página usa uma query ou mutation tipada da feature correspondente.
2. A camada de query chama `api` (Axios), passa sinal de cancelamento nas consultas e atualiza ou invalida cache após mutations.
3. O Axios chama `/api/*` e envia o token de sessão, quando existe, e `X-Guest-Id`.
4. O Service Worker MSW intercepta a requisição e executa o handler. Os handlers validam payloads com Zod e atualizam stores de demonstração.
5. Eventos de catálogo e pedido saem pela conexão WebSocket ligada a `@mswjs/socket.io-binding`; o cliente invalida as queries afetadas e reconcilia o estado via REST.

O *build* também pré-renderiza `/` e `/nft/:nftId` com `react-dom/server`. As páginas usam os mesmos dados padrão do catálogo que o MSW. O estado público do TanStack Query é serializado no HTML e hidratado no navegador. Dados de sessão, carrinho e favoritos não entram nesse estado. Depois da hidratação e da ativação dos *mocks*, a aplicação revalida o catálogo pela API para incorporar alterações salvas em `localStorage`. URLs com parâmetros de busca e rotas sem página pré-renderizada seguem pelo fluxo da SPA.

### Contratos REST

Todas as rotas listadas usam o prefixo `/api`.

| Método | Rota | Acesso | Resultado |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Público | Cria conta; `409 EMAIL_CONFLICT`, `422 VALIDATION_ERROR` |
| `POST` | `/auth/login` | Público | Cria sessão; `401 INVALID_CREDENTIALS`, `422 VALIDATION_ERROR` |
| `GET` | `/auth/session` | Sessão | Usuário atual; `401 SESSION_INVALID` |
| `POST` | `/auth/logout` | Público/idempotente | Revoga o token apresentado; `204` |
| `GET` / `PATCH` | `/profile` | Sessão | Lê ou altera nome/e-mail; conflito `409`, validação `422` |
| `PUT` | `/profile/avatar` | Sessão | Atualiza avatar; validação `422` |
| `POST` | `/profile/password` | Sessão | Altera senha; senha atual inválida `422` |
| `GET` / `PUT` / `DELETE` | `/wallets`, `/wallets/:slot` | Sessão | Lê, cria/altera ou remove carteira principal/secundária |
| `GET` / `PUT` / `DELETE` | `/favorites`, `/favorites/:nftId` | Sessão | Consulta, adiciona ou remove NFT favorito |
| `GET` | `/nfts` | Público | Busca, filtros, ordenação, paginação e facets por search params |
| `GET` | `/nfts/:nftId` | Público | Detalhe; `404 NFT_NOT_FOUND` |
| `GET` | `/nfts/:nftId/related` | Público | Lista de itens relacionados; `404` se inexistente |
| `GET` | `/cart` | Visitante ou sessão | Resumo autoritativo do carrinho, preço, cupom, taxas e total |
| `POST` | `/cart/items` | Visitante ou sessão | Adiciona item por NFT e edição; `404` inexistente, `409 OUT_OF_STOCK`, `422` inválido |
| `PATCH` / `DELETE` | `/cart/items/:nftId` | Visitante ou sessão | Altera quantidade ou remove a edição informada (campo `edition` no PATCH e parâmetro `edition` no DELETE) |
| `POST` / `DELETE` | `/cart/coupon` | Visitante ou sessão | Aplica ou remove cupom; inválido `422`, expirado `410` |
| `POST` | `/cart/merge` | Sessão | Soma o carrinho visitante ao carrinho da conta |
| `POST` | `/wallet/connect` | Sessão | Simula conexão de provedor; recusa `402 WALLET_REFUSED`, desconexão `409 WALLET_DISCONNECTED` |
| `POST` | `/orders` | Sessão | Cria pedido idempotente; exige `Idempotency-Key` e `X-Expected-Quote`; `202` pendente, `409` conflito/cotação/estoque |
| `GET` | `/orders/recover` | Sessão | Recupera um pedido pela chave idempotente, somente para seu proprietário |
| `GET` | `/orders/:orderId` | Proprietário do pedido | Consulta estado e snapshot; `404` quando não pertence à sessão |

Os erros seguem `{ code, message }`. Os valores ETH são *strings* decimais. Os *mocks* calculam os preços com inteiros em wei (`bigint`). Antes de registrar o pedido, o *endpoint* compara a cotação recebida com o resumo recalculado no servidor simulado.

#### Endpoints de demonstração

Os endpoints `/demo/*` são ferramentas para cenários locais e E2E, não contratos para um serviço de produção.

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` / `PUT` | `/demo/scenario` | Lê ou configura latência, falha única, resultado e eventos |
| `POST` | `/demo/scenario/reset` | Restaura as opções do cenário padrão |
| `POST` | `/demo/reset` | Limpa stores locais e repõe fixtures de demonstração |
| `POST` | `/demo/session/expire` | Expira deterministicamente a sessão do token Bearer enviado |
| `POST` | `/demo/nfts/:nftId/price` | Altera preço e emite `nft.updated` |
| `POST` | `/demo/nfts/:nftId/availability` | Altera disponibilidade e emite `nft.updated` |
| `GET` | `/demo/socket` | Consulta o número de conexões WebSocket abertas |
| `POST` | `/demo/socket/disconnect` | Fecha as conexões para testar a reconexão |
| `POST` | `/demo/orders/:orderId/event` | Reemite um evento de pedido nos testes de demonstração |

`nextFailure` aceita `kind: "offline"` ou `kind: "http"`, caminho completo, método opcional, status 4xx/5xx e `remaining` (número de chamadas que falharão). A configuração é consumida depois da última falha correspondente. `latencyMs` aplica um atraso constante. `latencySequenceMs` percorre uma sequência e permite respostas fora de ordem. `timeoutAfterOrderCreation` salva o pedido e retorna `504`, para reproduzir a tentativa idempotente. `walletOutcome` simula conexão aceita, recusada ou carteira desconectada. `walletDisconnectDuringCheckout` interrompe a conexão entre o início do *checkout* e o pedido. `paymentOutcome` escolhe confirmação ou recusa. `dropOrderEvents`, `duplicateOrderEvents` e `staleOrderEvent` controlam a entrega dos eventos do pedido.

### Rotas e estado na URL

`/` carrega busca, filtros, faixa de preço, ordenação, aba e página em parâmetros de busca validados por Zod. `/nft/:nftId` permite acesso direto ao detalhe. `/carrinho` é público para preservar o fluxo do visitante. `/checkout`, `/perfil`, `/carteiras` e `/favoritos` exigem token e guardam o destino para o retorno após a autenticação. `/entrar` abre o modal em qualquer rota. Quando a URL funciona como entrada protegida, ela carrega o modo e o destino pelos parâmetros de busca. `/pedido/:orderId` recupera o pedido do usuário e funciona após recarregar a página. Rotas desconhecidas usam `notFoundComponent`. A regra da Vercel usa `spa.html` como fallback para rotas sem arquivo correspondente.

Filtros e navegação que precisam persistir após recarregar a página ou usar o histórico ficam na URL. O componente guarda o estado temporário de formulário, modal, senha visível e mensagens de retorno. O identificador do visitante fica no `localStorage`. A chave idempotente temporária fica em `sessionStorage`, para recuperar uma resposta perdida na mesma aba.

### TanStack Query

Escolhi usar a raiz do recurso seguida dos parâmetros que definem a resposta. A lista de catálogo usa `['nfts', 'list', 2, search]`. Detalhe e relacionados usam `['nfts', 'detail', nftId]` e `['nfts', 'related', nftId]`. Os recursos da conta usam uma raiz por domínio; carrinho usa `['cart']`; pedido usa `['orders', orderId]`; favoritos usam raiz própria. Os parâmetros de busca completos identificam a consulta e evitam compartilhar resultados entre filtros.

- Catálogo e detalhe: `staleTime` de 30 s; alteração via `nft.updated` invalida lista e carrinho.
- Perfil/carteiras/favoritos: `staleTime` de 30 s; mutations invalidam ou atualizam o recurso afetado. Favorito e avatar usam atualização otimista com rollback.
- Sessão: `staleTime` de 60 s, sem retry automático em `401`.
- Carrinho: `staleTime` de 10 s; mutations substituem o resumo pelo retorno da API.
- Pedido: consulta frequente enquanto `pending`, para reconciliar interrupção ou perda de evento; para ao chegar em estado terminal.
- Falhas de query não são transformadas em dados fictícios. A interface mostra loading, erro, vazio ou conteúdo e permite retry onde faz sentido.

As consultas de catálogo e detalhe fazem até duas novas tentativas após falhas transitórias e não repetem `404`. Sessão, perfil, carteiras e favoritos não fazem tentativas automáticas. A consulta de pedido admite duas novas tentativas e, enquanto o pedido está `pending`, consulta a API a cada 500 ms. O carrinho segue a política padrão do TanStack Query, com até três novas tentativas em falhas de consulta. As *mutations* em geral não têm retry automático. Se a resposta da criação de pedido se perder, o checkout repete a chamada com a mesma chave idempotente e consulta `/orders/recover` se ainda não receber resposta. A chave sobrevive ao recarregamento da aba. Uma falha na união do carrinho visitante mostra um aviso, tenta novamente uma vez e preserva a identidade visitante até a união ter sucesso.

### Autenticação e isolamento

O *mock* emite um token Bearer aleatório e salva a sessão com expiração de oito horas. A senha é derivada por PBKDF2 com *salt*, sem armazenamento em texto claro. A interface guarda o token em `localStorage`. O Axios adiciona o cabeçalho e remove o token após `401`. A proteção de rota evita montar áreas privadas sem token, e a API simulada faz a verificação final. A identidade do carrinho é `user:<id>` para usuário e `guest:<uuid>` para visitante. Perfil, carteiras, favoritos e conexões de provedor ficam associados ao ID do usuário. Os pedidos guardam o proprietário e só podem ser consultados por ele. O pedido também precisa do identificador da conexão simulada para o provedor escolhido.

Ao sair, a *mutation* limpa o token e invalida as consultas da sessão anterior. As telas públicas podem refazer as consultas como visitante. O cadastro e o *login* juntam o carrinho do visitante ao da conta. As contas `test@kurio.test` e `test2@kurio.test` são *fixtures* locais. O *hash* de senha, o token e o `localStorage` são aproximações didáticas e não substituem a proteção de um *backend*.

### Carrinho e pedidos

O armazenamento guarda o identificador do NFT, a edição e a quantidade, sem copiar o preço. Cada edição tem estoque próprio e compartilha o limite total do NFT. Carrinhos antigos sem edição são migrados para `1/50`. O resumo e o recibo preservam a edição escolhida. Em cada leitura, o sistema consulta o catálogo atual e recalcula subtotal, desconto de cupom, taxa e total com wei inteiros. A resposta da API fornece a cotação exibida. O cupom `KURIO10` aplica 10%; `EXPIRADO` simula um cupom vencido; qualquer outro código é inválido.

Antes de criar o pedido, o cliente busca o carrinho de novo e compara a cotação com a que o usuário revisou. A API simulada também recalcula os valores e confere o estoque. Isso impede a confirmação com uma cotação desatualizada. A criação exige `Idempotency-Key`. A mesma chave e o mesmo conteúdo retornam o mesmo pedido. Se o conteúdo mudar, a API retorna um conflito. A resposta inicial é `202` com pedido `pending`. Após o atraso configurado, a simulação decide entre `confirmed` e `declined`. A confirmação remove só as quantidades compradas e reduz o estoque; a recusa mantém o carrinho. O recibo usa um *snapshot* do pedido e um *hash* sintético.

### Socket.IO e MSW

O cliente abre uma conexão Socket.IO no ciclo de vida da aplicação. Ele usa `socket.io-client`, o caminho `/realtime/` e transporte WebSocket. O *handler* MSW liga `ws.link` a `toSocketIo` de `@mswjs/socket.io-binding`. Os eventos passam pelo cliente Socket.IO e pelos *listeners* da aplicação.

`nft.updated` carrega `eventId`, `nftId` e `version`. O cliente ignora versões já vistas e invalida catálogo e carrinho. `order.updated` carrega `eventId`, `orderId`, `status` e `version`. Ele só invalida o pedido que já existe no *cache* local. O resultado completo vem da API autenticada, não do *payload* do evento. O cliente ignora eventos repetidos e atrasados pela versão. Após a reconexão, invalida as consultas de catálogo, carrinho e pedidos pendentes. O *polling* recupera o estado do pedido mesmo sem evento ou após recarregar a página. A limpeza remove os *listeners* e fecha o *socket*. A conexão é substituída no *login*, no *logout* e na expiração. Ela também é encerrada ao sair da página. A reconexão reconcilia os recursos ativos.

O *binding* tem limites. Ele é uma ponte de desenvolvimento entre MSW WebSocket e a interface Socket.IO. Não há servidor Socket.IO real, *rooms*, autorização de *namespace* ou entrega confiável. A demonstração mantém as conexões na memória da aba e emite eventos localmente. Ao recarregar a página, a API simulada recupera o estado salvo em `localStorage`. Em produção, substitua essa ponte por um serviço *backend*/Socket.IO autenticado, com *rooms* por usuário e persistência transacional. Não compartilhe `localStorage` como armazenamento multiusuário de servidor.

### Testes, acessibilidade e performance

O Playwright inicia um *build* otimizado e uma prévia em Chromium. Ele guarda o *trace* quando há falha. Os testes E2E devem partir de um contexto novo, controlar latência e eventos pela API de demonstração e observar o resultado na interface. O relatório HTML e os *traces* são artefatos de execução, não código-fonte. A regressão visual precisa de *baselines* versionadas, atualizadas deliberadamente quando o Figma mudar. A comparação deve usar o mesmo navegador, fonte e *viewport*.

O Lighthouse está configurado para início e detalhe, com três medições e mediana em *desktop* e *mobile*. Os arquivos JSON definem os limites da auditoria; os resultados executados estão em [docs/lighthouse](docs/lighthouse/README.md), com versões, LCP, CLS e TBT. Na última auditoria local, a mediana de performance mobile foi 86 no início e 90 no detalhe. Para comparar uma mudança, repita a auditoria em uma máquina ou CI de referência, com os *mocks* ativos.

### Deploy e limites

`vercel.json` configura `spa.html` como fallback para as rotas da SPA. Vercel hospeda o bundle estático; o Service Worker MSW executa no navegador e o binding Socket.IO é uma simulação local ao navegador. Isso serve à demonstração e não exige função serverless persistente. Se o requisito mudar para comunicação entre usuários/dispositivos ou evento no servidor, será necessário um backend e servidor Socket.IO hospedados, com CORS, autenticação e *rooms*. A publicação precisa ser conferida com acesso direto e recarregamento das rotas.

### Trade-offs e decisões de UX

- Modal de autenticação e carrinho visitante mantêm descoberta disponível sem conta; ações privadas pedem login e retornam ao fluxo anterior.
- Pedido pendente é visível e recuperável; confirmação só aparece após estado terminal confirmado.
- Uma implementação de frontend e handlers locais reduz dependências externas e permite cenários reproduzíveis dentro do prazo, mas não demonstra disponibilidade multiusuário real.
- Perfil, carteiras e confirmação mobile funcionam sem criar variações de domínio só para o breakpoint; os componentes adaptam layout e ações.
- Páginas editoriais e links sem requisito funcional não simulam sucesso. Ações fora do escopo devem indicar indisponibilidade ou permanecer apenas navegação coerente.

### Diferenças conhecidas e itens operacionais

- A confirmação de transação e o link de explorador são simulados e não transferem ativos reais.
- Contagens/facets e parte do catálogo são fixtures determinísticas para cobrir filtros; não são contagens derivadas de um serviço de marketplace real.
- O reset restaura catálogo e stores no contexto do navegador atual; múltiplos contextos não compartilham estado.
- A última medição Lighthouse local atingiu 90 em performance mobile no detalhe e 86 no início. Os *traces* E2E são gerados a cada execução; as *baselines* visuais ficam em `tests/e2e`. A URL pública precisa ser conferida após a publicação.


#### Galeria e precisão

A *fixture* fornece uma imagem por NFT. A galeria mostra a imagem principal e um recorte ampliado da mesma arte. Não há imagens adicionais simuladas como se fossem obras diferentes. Os valores ETH são convertidos com `bigint` e exibidos como *strings* com até 18 casas, sem arredondamento para duas casas. Os descontos são calculados em wei inteiros.

O endpoint de demonstração `POST /api/demo/socket/disconnect` fecha as conexões WebSocket existentes; `GET /api/demo/socket` informa quantas estão conectadas. O cliente Socket.IO tenta reconectar normalmente.
