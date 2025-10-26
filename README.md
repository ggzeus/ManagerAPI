# 🤖 Bot Manager - Discord + KeyAuth Integration + API Web

Bot completo de Discord para gerenciamento de clientes com integração à SellerAPI do KeyAuth e API web para verificação de membros.

## 🌐 **NOVIDADE: API Web Hostável**

O bot agora inclui um servidor web HTTP que pode ser hospedado publicamente para verificar membros do Discord via API REST.

### 🚀 **Deploy Gratuito em Plataformas Cloud:**

#### **Railway** (Recomendado) ⭐
1. Acesse [Railway.app](https://railway.app)
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente
4. Deploy automático!

#### **Render**
1. Acesse [Render.com](https://render.com)
2. Conecte GitHub e selecione o repositório
3. Configure variáveis de ambiente
4. Deploy gratuito com domínio público

#### **Glitch**
1. Acesse [Glitch.com](https://glitch.com)
2. Importe do GitHub
3. Configure .env
4. Funciona 24/7

### 🌍 **API Endpoints Públicos:**
Após o deploy, sua API estará disponível globalmente:

- `https://seu-app.railway.app/` - Página de documentação
- `https://seu-app.railway.app/health` - Status do bot
- `https://seu-app.railway.app/check-member?discordId=USER_ID` - Verificar membro

### 💻 **Exemplo de Uso da API:**
```javascript
// JavaScript
const response = await fetch('https://seu-app.railway.app/check-member?discordId=123456789012345678');
const data = await response.json();
console.log(data.isInServer); // true/false
```

```python
# Python
import requests
response = requests.get('https://seu-app.railway.app/check-member?discordId=123456789012345678')
data = response.json()
print(data['isInServer'])  # True/False
```

## 📋 Funcionalidades

### 👥 Para Usuários
- ✅ **Verificação de Licença** - Sistema automático de verificação via KeyAuth
- 🎫 **Sistema de Tickets** - Suporte direto com a equipe
- 📊 **Dashboard Pessoal** - Consulta de informações da licença
- 🔔 **Notificações** - Alertas sobre expiração de licença

### 🛠️ Para Administradores
- 🔑 **Gerenciamento de Licenças** - Criar, deletar, estender licenças
- 📈 **Estatísticas** - Dashboard completo do servidor
- 📝 **Sistema de Logs** - Registro de todas as ações
- 🎯 **Atribuição Automática de Roles** - Baseado no status da licença

## 🚀 Instalação

### 1. Requisitos
- Node.js v16.9.0 ou superior
- Conta KeyAuth com SellerAPI ativa
- Bot do Discord criado no [Discord Developer Portal](https://discord.com/developers/applications)

### 2. Configuração

**Clone ou baixe o projeto:**
```bash
cd "Bot Manager"
```

**Instale as dependências:**
```bash
npm install
```

**Configure o arquivo `.env`:**
```bash
# Copie o arquivo de exemplo
copy .env.example .env
```

**Edite o arquivo `.env` com suas credenciais:**
```env
# Discord Bot Configuration
DISCORD_TOKEN=seu_token_do_bot_aqui
CLIENT_ID=seu_client_id_aqui
GUILD_ID=seu_server_id_aqui

# KeyAuth SellerAPI Configuration
KEYAUTH_SELLER_KEY=sua_seller_key_aqui
KEYAUTH_APP_NAME=nome_do_seu_app

# Roles Configuration
VERIFIED_ROLE_ID=id_do_role_verificado
CLIENT_ROLE_ID=id_do_role_cliente
ADMIN_ROLE_ID=id_do_role_admin

# Channels Configuration
VERIFY_CHANNEL_ID=id_do_canal_verificacao
LOGS_CHANNEL_ID=id_do_canal_logs
TICKETS_CATEGORY_ID=id_da_categoria_tickets
```

### 3. Como Obter as Configurações

#### **Discord Token e IDs:**
1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Selecione seu bot
3. Vá em "Bot" → Copie o Token
4. Vá em "OAuth2" → Copie o Client ID
5. No Discord, ative o "Modo Desenvolvedor" (Configurações > Avançado)
6. Clique com botão direito no servidor/canal/role e copie o ID

#### **KeyAuth SellerAPI:**
1. Acesse [KeyAuth Dashboard](https://keyauth.cc)
2. Vá em sua aplicação
3. Acesse "Seller Settings"
4. Copie sua Seller Key

### 4. Registrar Comandos
```bash
node deploy-commands.js
```

### 5. Iniciar o Bot
```bash
npm start
```

Para desenvolvimento com auto-reload:
```bash
npm run dev
```

## 📚 Comandos Disponíveis

### Comandos de Usuário
| Comando | Descrição |
|---------|-----------|
| `/verify` | Verificar sua licença KeyAuth |
| `/mylicense` | Ver informações da sua licença |
| `/ticket` | Criar um ticket de suporte |
| `/help` | Ver todos os comandos |

### Comandos de Admin
| Comando | Descrição |
|---------|-----------|
| `/createkey` | Criar nova(s) licença(s) |
| `/deletekey` | Deletar uma licença |
| `/extendkey` | Estender duração de uma licença |
| `/checkkey` | Ver informações de uma licença |
| `/stats` | Ver estatísticas do servidor |

## 🔧 Personalização

### Configurações do Bot (`settings.json`)
```json
{
  "prefix": "!",
  "embedColor": "#7289DA",
  "ticketSettings": {
    "maxTicketsPerUser": 3,
    "supportRoleId": "ID_DO_ROLE_SUPORTE"
  },
  "licenseSettings": {
    "autoRoleAssignment": true,
    "checkInterval": 3600000,
    "defaultDuration": 30
  },
  "messages": {
    "welcome": "Mensagem de boas-vindas personalizada",
    "verifySuccess": "Mensagem de sucesso personalizada",
    "verifyError": "Mensagem de erro personalizada"
  }
}
```

## 📁 Estrutura do Projeto
```
Bot Manager/
├── commands/          # Comandos slash do bot
│   ├── verify.js
│   ├── createkey.js
│   ├── deletekey.js
│   ├── extendkey.js
│   ├── checkkey.js
│   ├── mylicense.js
│   ├── ticket.js
│   ├── help.js
│   └── stats.js
├── events/            # Eventos do Discord
│   ├── guildMemberAdd.js
│   ├── guildMemberRemove.js
│   └── interactionCreate.js
├── utils/             # Utilitários
│   ├── keyauth.js     # API do KeyAuth
│   ├── database.js    # Sistema de database local
│   └── logger.js      # Sistema de logs
├── data/              # Database local (criado automaticamente)
├── index.js           # Arquivo principal
├── deploy-commands.js # Script para registrar comandos
├── settings.json      # Configurações do bot
├── package.json
├── .env              # Variáveis de ambiente (criar)
└── .env.example      # Exemplo de configuração
```

## 🔐 Segurança

- ✅ Nunca compartilhe seu arquivo `.env`
- ✅ Mantenha o `.gitignore` atualizado
- ✅ Use permissões adequadas para roles de admin
- ✅ Revise regularmente os logs de atividade
- ✅ Mantenha as dependências atualizadas

## 🐛 Troubleshooting

### Bot não está online
- Verifique se o token está correto no `.env`
- Confirme que o bot tem permissões adequadas no servidor
- Verifique se as dependências foram instaladas

### Comandos não aparecem
- Execute `node deploy-commands.js` novamente
- Verifique se CLIENT_ID e GUILD_ID estão corretos
- Aguarde alguns minutos (cache do Discord)

### Erro na verificação de licença
- Confirme que KEYAUTH_SELLER_KEY está correta
- Verifique se KEYAUTH_APP_NAME está correto
- Teste a licença diretamente no KeyAuth Dashboard

### Tickets não funcionam
- Verifique se TICKETS_CATEGORY_ID está configurado
- Confirme que o bot tem permissão para criar canais
- Verifique se supportRoleId em settings.json está correto

## 📞 Suporte

- **KeyAuth:** [Discord Oficial](https://discord.gg/keyauth)
- **Documentação KeyAuth:** [docs.keyauth.cc](https://docs.keyauth.cc)
- **Discord.js:** [Guia Oficial](https://discordjs.guide)

## 📝 Licença

Este projeto é fornecido como está, sem garantias.

## 🎉 Contribuições

Sinta-se livre para melhorar o código e adicionar novas funcionalidades!

---

**Desenvolvido com ❤️ para gerenciamento de clientes via Discord + KeyAuth**
