# 🚀 Guia Rápido de Início

## Passo 1: Instalar Dependências
```bash
npm install
```

## Passo 2: Configurar o Bot

### 2.1 - Criar Bot no Discord
1. Acesse: https://discord.com/developers/applications
2. Clique em "New Application"
3. Dê um nome ao seu bot
4. Vá em "Bot" no menu lateral
5. Clique em "Add Bot"
6. **Copie o Token** (você vai precisar)
7. Ative as seguintes "Privileged Gateway Intents":
   - ✅ PRESENCE INTENT
   - ✅ SERVER MEMBERS INTENT
   - ✅ MESSAGE CONTENT INTENT

### 2.2 - Adicionar Bot ao Servidor
1. Vá em "OAuth2" → "URL Generator"
2. Selecione:
   - **Scopes**: `bot` e `applications.commands`
   - **Bot Permissions**: `Administrator` (ou configure manualmente)
3. Copie a URL gerada e cole no navegador
4. Selecione seu servidor e autorize

### 2.3 - Obter IDs Necessários

#### Client ID:
- OAuth2 → Copie "Client ID"

#### Guild ID (Server ID):
- No Discord, ative "Modo Desenvolvedor" (Configurações > Avançado > Modo Desenvolvedor)
- Clique com botão direito no seu servidor → Copiar ID

#### Role IDs:
- Clique com botão direito no role → Copiar ID
- Você precisa de:
  - Role "Verificado" (para usuários verificados)
  - Role "Cliente" (para clientes ativos)
  - Role "Admin" (para administradores)

#### Channel IDs:
- Clique com botão direito no canal → Copiar ID
- Você precisa de:
  - Canal de verificação (onde usuários vão verificar)
  - Canal de logs (logs do sistema)
  - Categoria de tickets (onde tickets serão criados)

### 2.4 - Configurar KeyAuth

1. Acesse: https://keyauth.cc
2. Faça login na sua conta
3. Vá em sua aplicação
4. Acesse "Seller Settings"
5. **Copie sua Seller Key**
6. Anote o **nome exato da sua aplicação**

## Passo 3: Configurar Arquivo .env

Abra o arquivo `.env` e preencha com suas informações:

```env
# Discord Bot Configuration
DISCORD_TOKEN=MTA5ODc2NTQzMjE...  # Token do seu bot
CLIENT_ID=1234567890  # Application ID
GUILD_ID=9876543210  # ID do seu servidor

# KeyAuth SellerAPI Configuration
KEYAUTH_SELLER_KEY=abc123...  # Sua Seller Key
KEYAUTH_APP_NAME=MeuApp  # Nome do seu app (exato)

# Roles Configuration
VERIFIED_ROLE_ID=1111111111
CLIENT_ROLE_ID=2222222222
ADMIN_ROLE_ID=3333333333

# Channels Configuration
VERIFY_CHANNEL_ID=4444444444
LOGS_CHANNEL_ID=5555555555
TICKETS_CATEGORY_ID=6666666666
```

## Passo 4: Registrar Comandos
```bash
node deploy-commands.js
```

Você deve ver:
```
✅ Comando preparado: verify
✅ Comando preparado: createkey
...
✅ 9 comandos registrados no servidor!
```

## Passo 5: Iniciar o Bot
```bash
npm start
```

Você deve ver:
```
✅ Comando carregado: verify
✅ Comando carregado: createkey
...
✅ Evento carregado: guildMemberAdd
✅ Bot online como SeuBot#1234
📊 Servidores: 1
👥 Usuários: 10
```

## 🎉 Pronto!

Seu bot está funcionando! Agora você pode:

### Testar a Verificação:
1. No Discord, digite `/verify`
2. Insira uma licença válida do KeyAuth
3. O bot deve atribuir os roles automaticamente

### Criar Licenças:
1. Digite `/createkey`
2. Defina a duração em dias
3. Quantidade de licenças
4. O bot vai gerar as licenças

### Abrir Ticket:
1. Digite `/ticket`
2. Um canal privado será criado
3. Equipe de suporte será notificada

## ❗ Problemas Comuns

### "Invalid Token"
- Verifique se copiou o token completo
- Regenere o token se necessário

### "Missing Access"
- Bot precisa ter permissão de Administrador
- Verifique se o role do bot está acima dos outros

### "Unknown Application"
- CLIENT_ID ou GUILD_ID incorreto
- Verifique os IDs novamente

### Comandos não aparecem
- Execute `node deploy-commands.js` novamente
- Aguarde 1-2 minutos
- Reinicie o Discord

## 📞 Precisa de Ajuda?

Verifique o arquivo `README.md` para documentação completa!
