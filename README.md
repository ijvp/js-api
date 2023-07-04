# TurboDash API

## Requerimentos
- Node (>= 18)
- NPM
- Redis
- [TurboDash Python API](https://github.com/Turbo-Partners/dashboard-python-api) (para requisições google)

## Estrutura de Pastas
Este é um aplicativo Express com a seguinte estrutura de pastas:
- `.github/workflows/deployment.yml`: Contém a configuração do fluxo de trabalho de implantação para o GitHub Actions que fará o deploy para o container AWS LightSail.

- `clients`: Contém arquivos para interação com clientes externos, como Google, Redis e Shopify. O arquivo `index.js` é o ponto de entrada para exportações de clientes.

- `controllers`: Contém arquivos JavaScript que definem controladores para várias funcionalidades, como Facebook, Google e operações relacionadas à loja.

- `middleware`: Contém funções de middleware usadas no aplicativo, como autenticação e middleware da loja.

- `models`: Contém o arquivo `User.js` que define o modelo mongo do usuário para o aplicativo.

- `routes`: Contém arquivos que definem as rotas da API para autenticação, Facebook, GDPR, Google, Shopify e endpoints relacionados ao usuário. As rotas devem se preocupar apenas com receber requisições e retornar dados dos seus controllers respectivos para o cliente, e não com as regras de negócios em si.

- `utils`: Contém arquivos utilitários para conexão com banco de dados, criptografia, registro, gerenciamento de sessão e funções relacionadas à loja.

- `.env.example`: Um exemplo de arquivo que demonstra a estrutura e as chaves das variáveis de ambiente necessárias para o aplicativo.

- `Dockerfile`: Especifica as instruções para criar uma imagem Docker do aplicativo.

- `package.json`: Contém as dependências e scripts do aplicativo.

- `server.js`: O ponto de entrada principal do aplicativo Express.

## Uso

### Uso local
1. Instale as dependências: `npm install`
2. Crie uma cópia do arquivo `.env.example` e renomeie-o para `.env`. Forneça os valores necessários para cada variável de ambiente.
3. Roda o projeto em modo de desenvolvimento: `npm run dev`

### Uso com Docker
Para executar o aplicativo usando o Docker, você pode criar a imagem Docker usando o arquivo `Dockerfile` fornecido e, em seguida, executar um contêiner baseado nessa imagem.

```
# Crie a imagem Docker
docker build -t express-app .

# Execute um contêiner com base na imagem
docker run -p 3000:3000 express-app
```

## Pendencias/bugs
- Testes unitários
- Automação de fluxos e logs GDPR
- Deletar loja do conjunto de lojas do usuário no webhook `/shop/redact`, mesmo sem receber `req.session.userId`
- Fluxo de oAuth da shopify quando o app é instalado a partir da Shopify App Store