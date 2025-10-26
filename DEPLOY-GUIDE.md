# 🚀 Guia Completo de Deploy - Scarlet Discord Bot

## 🎯 **Objetivo**
Hospedar seu bot Discord com API web publicamente, permitindo que qualquer aplicação externa verifique membros do seu servidor Discord via HTTP.

## 🌟 **Opção 1: Railway (RECOMENDADO)**

### **Por que Railway?**
- ✅ **500 horas gratuitas/mês** (suficiente para manter 24/7)
- ✅ **Deploy automático** do GitHub
- ✅ **Domínio público** gratuito (.railway.app)
- ✅ **Fácil configuração** de variáveis
- ✅ **SSL/HTTPS** automático

### **Passo a Passo:**

#### 1. **Preparar o Repositório GitHub**
```bash
# 1. Crie um repositório no GitHub
# 2. Faça upload de todos os arquivos do bot
# 3. Certifique-se que o .env NÃO está no repositório (use .env.example)
```

#### 2. **Configurar Railway**
1. Acesse [railway.app](https://railway.app)
2. Faça login com GitHub
3. Clique "New Project"
4. Selecione "Deploy from GitHub repo"
5. Escolha seu repositório do bot

#### 3. **Configurar Variáveis de Ambiente**
No Railway Dashboard → Variables, adicione:

```env
DISCORD_TOKEN=seu_token_aqui
DISCORD_CLIENT_ID=seu_client_id
GUILD_ID=seu_server_id
KEYAUTH_SELLER_KEY=sua_seller_key
NODE_ENV=production
```

#### 4. **Deploy Automático**
- O Railway detecta automaticamente que é Node.js
- Executa `npm install` e `npm start`
- Em ~2 minutos seu bot estará online!

#### 5. **Obter URL Pública**
- Vá em Settings → Public Networking
- Clique "Generate Domain"
- Sua API estará em: `https://seu-app.railway.app`

## 🌈 **Opção 2: Render**

### **Passo a Passo:**

#### 1. **Preparar Repositório** (igual ao Railway)

#### 2. **Configurar Render**
1. Acesse [render.com](https://render.com)
2. Conecte GitHub
3. "New" → "Web Service"
4. Selecione seu repositório

#### 3. **Configurações:**
- **Environment:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Auto-Deploy:** Yes

#### 4. **Variáveis de Ambiente:**
Adicione as mesmas variáveis do Railway.

## 🎮 **Opção 3: Glitch**

### **Para Projetos Menores:**
1. Acesse [glitch.com](https://glitch.com)
2. "New Project" → "Import from GitHub"
3. Cole URL do seu repositório
4. Configure variáveis no arquivo `.env`

## 🔧 **Configuração Pós-Deploy**

### **1. Deploy dos Comandos Discord**
Após o primeiro deploy, execute uma vez:
```bash
# No terminal do Railway/Render
node deploy-commands.js
```

### **2. Teste da API**
Teste se está funcionando:
```
GET https://seu-app.railway.app/health
```

### **3. Configure Webhook (Opcional)**
Para manter o bot sempre ativo, configure um webhook que faça ping a cada 5 minutos:
```
GET https://seu-app.railway.app/health
```

## 🌐 **URLs da Sua API**

Após o deploy, você terá:

### **Railway:**
- 🏠 Página: `https://seu-app.railway.app/`
- ❤️ Health: `https://seu-app.railway.app/health`
- 👤 Check Member: `https://seu-app.railway.app/check-member?discordId=ID`

### **Render:**
- 🏠 Página: `https://seu-app.onrender.com/`
- ❤️ Health: `https://seu-app.onrender.com/health`
- 👤 Check Member: `https://seu-app.onrender.com/check-member?discordId=ID`

## 💻 **Exemplos de Uso da API Pública**

### **JavaScript/Node.js:**
```javascript
const axios = require('axios');

async function checkDiscordMember(discordId) {
    const response = await axios.get(`https://seu-app.railway.app/check-member?discordId=${discordId}`);
    return response.data.isInServer;
}

// Uso
checkDiscordMember('123456789012345678').then(isInServer => {
    console.log('Usuário está no servidor:', isInServer);
});
```

### **Python:**
```python
import requests

def check_discord_member(discord_id):
    response = requests.get(f'https://seu-app.railway.app/check-member?discordId={discord_id}')
    return response.json()['isInServer']

# Uso
is_in_server = check_discord_member('123456789012345678')
print(f'Usuário está no servidor: {is_in_server}')
```

### **PHP:**
```php
function checkDiscordMember($discordId) {
    $url = "https://seu-app.railway.app/check-member?discordId={$discordId}";
    $response = file_get_contents($url);
    $data = json_decode($response, true);
    return $data['isInServer'];
}

// Uso
$isInServer = checkDiscordMember('123456789012345678');
echo "Usuário está no servidor: " . ($isInServer ? 'Sim' : 'Não');
```

### **cURL:**
```bash
curl "https://seu-app.railway.app/check-member?discordId=123456789012345678"
```

## 🔍 **Monitoramento**

### **Logs do Railway:**
- Acesse o dashboard do Railway
- Vá em "Deployments"
- Clique no deployment ativo
- Veja logs em tempo real

### **Status da API:**
- Monitore com `GET /health`
- Resposta esperada:
```json
{
  "success": true,
  "status": "online",
  "bot": {
    "username": "Scarlet ® - Manager",
    "ready": true
  },
  "servers": 2,
  "users": 732
}
```

## 🛡️ **Segurança**

### **Variáveis de Ambiente:**
- ✅ **NUNCA** faça commit do arquivo `.env`
- ✅ Use apenas variáveis de ambiente da plataforma
- ✅ Mantenha tokens seguros

### **Rate Limiting (Opcional):**
Para evitar spam, você pode adicionar rate limiting:
```javascript
// No webserver.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100 // máximo 100 requests por minuto
});

this.app.use('/check-member', limiter);
```

## 🚨 **Troubleshooting**

### **Bot não conecta:**
- ✅ Verifique se `DISCORD_TOKEN` está correto
- ✅ Confirme que todas as variáveis estão configuradas
- ✅ Veja logs no dashboard da plataforma

### **API não responde:**
- ✅ Teste endpoint `/health` primeiro
- ✅ Verifique se porta está configurada corretamente
- ✅ Confirme se `GUILD_ID` está correto

### **Comandos não aparecem:**
- ✅ Execute `node deploy-commands.js` uma vez
- ✅ Aguarde alguns minutos (cache do Discord)
- ✅ Verifique se `DISCORD_CLIENT_ID` está correto

## 💰 **Custos**

### **Railway:** 
- 🆓 500 horas/mês grátis
- 💵 $5/mês para uso ilimitado

### **Render:**
- 🆓 750 horas/mês grátis
- 💵 $7/mês para uso ilimitado

### **Glitch:**
- 🆓 1000 horas/mês grátis
- ⚠️ Dorme após inatividade

## 🎉 **Conclusão**

Após seguir este guia, você terá:

- ✅ Bot Discord funcionando 24/7
- ✅ API pública para verificar membros
- ✅ Domínio HTTPS gratuito
- ✅ Deploy automático do GitHub
- ✅ Monitoramento e logs

**Sua API estará acessível globalmente e poderá ser usada em qualquer aplicação!**

---

**🚀 Deploy realizado com sucesso! Sua API Discord está no ar!**