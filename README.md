# Iris Main API
Essa é a api principal do projeto Iris. Ela é responsavel por:
- receber todos as requisições dos nossos usuários no frontend
- gestão de sessões da aplicação, e das sessões de suas possiveis integrações
- buscar informações gerais da(s) loja(s) do usuário
- conectar e validar possiveis integrações com terceiros, diretamente de suas origens ou de algum microservico nosso (e.g: py-api).


## Desenvolvimento

### Requerimentos
- De preferencia um mac (vão se fuder todos vocês)
- Docker
- Node (>= 20)
- Npm
- Redis (usuado para cache de sessões)
- Ngrok (para criar túnel possibilitando fluxo completo de oAuth)
- [Py-api](https://github.com/ijvp/py-api), responsável pela integração com Google Ads.


### Uso local
Para desenvolvimento isolado desse componento do projeto Iris.

1. Instale as dependências.
2. Crie os arquivo .env.local e cria as chaves com seus valores seguindo o .env.example.
3. Verifique se o redis-server está rodando localmente e testa sua conexao: 

```bash
$ redis-cli 
$ ping
```

4. Roda `npm run start:local`
5. (Opcional) Abre uma nova aba no terminal e roda `npm run tunnel` para expor sua API local.

### Uso com Docker
Para desenvolvimento e testes do sistema Iris como um todo. No docker-compose (do projeto pai) todos os componentes da infraestrutura estão definidos, incluindo o ngrok.
1. Instale as dependências.
2. Crie o arquivo .env.development e cria as chaves com seus valores seguindo o .env.example.
3. Confere as chaves .env do projeto Iris
4. Roda: `docker compose up -d`

Para executar o aplicativo usando o Docker, você pode criar a imagem Docker usando o arquivo `Dockerfile` fornecido e, em seguida, executar um contêiner baseado nessa imagem.

## Estrutura de Pastas

## Pendencias/bugs
- Testes unitários
- Subscrição de wehooks obrigátorios da Shopify
