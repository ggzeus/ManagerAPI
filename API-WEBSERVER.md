# 🔮 Scarlet ® - Discord API Web Server

## 📋 Visão Geral

O bot Discord agora inclui um servidor web HTTP que permite verificar se usuários estão no servidor Discord através de uma API REST externa.

## 🌐 Endpoints Disponíveis

### 🏠 Página Principal
- **URL:** `http://localhost:8080/`
- **Método:** GET
- **Descrição:** Página inicial com documentação visual da API

### ❤️ Health Check
- **URL:** `http://localhost:8080/health`
- **Método:** GET
- **Descrição:** Verifica o status do bot e servidor

**Resposta de Exemplo:**
```json
{
  "success": true,
  "status": "online",
  "bot": {
    "username": "Scarlet ® - Manager",
    "id": "1431651932765950038",
    "ready": true
  },
  "servers": 2,
  "users": 732,
  "uptime": 3600.245,
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### 👤 Verificar Membro
- **URL:** `http://localhost:8080/check-member`
- **Método:** GET
- **Parâmetros:** 
  - `discordId` (obrigatório) - ID do usuário no Discord

**Exemplo de Uso:**
```
GET http://localhost:8080/check-member?discordId=123456789012345678
```

**Resposta quando usuário ESTÁ no servidor:**
```json
{
  "success": true,
  "discordId": "123456789012345678",
  "isInServer": true,
  "serverName": "Servidor Scarlet",
  "serverId": "1332186483750211647",
  "checkedAt": "2024-01-15T10:30:45.123Z",
  "member": {
    "id": "123456789012345678",
    "username": "usuario_exemplo",
    "displayName": "Usuário Exemplo",
    "discriminator": "1234",
    "tag": "usuario_exemplo#1234",
    "avatar": "https://cdn.discordapp.com/avatars/...",
    "joinedAt": "2024-01-10T15:20:30.000Z",
    "roles": [
      {
        "id": "1431641793488752812",
        "name": "✅ Verificado",
        "color": "#00ff00"
      }
    ],
    "isBot": false,
    "premiumSince": null,
    "nickname": "Apelido Personalizado"
  }
}
```

**Resposta quando usuário NÃO está no servidor:**
```json
{
  "success": true,
  "discordId": "123456789012345678",
  "isInServer": false,
  "serverName": "Servidor Scarlet",
  "serverId": "1332186483750211647",
  "checkedAt": "2024-01-15T10:30:45.123Z",
  "member": null
}
```

## 🔧 Configuração

### Variáveis de Ambiente (.env)
```env
# Configuração do Servidor Web
WEB_SERVER_PORT=8080

# ID do Servidor Discord para verificação
GUILD_ID=1332186483750211647
```

### Inicialização Automática
O servidor web é iniciado automaticamente quando o bot Discord fica online.

## 🛡️ Segurança e CORS

- **CORS:** Habilitado para todos os domínios (`*`)
- **Métodos Permitidos:** GET, POST, PUT, DELETE, OPTIONS
- **Headers Permitidos:** Content-Type, Authorization

## 📝 Códigos de Status HTTP

| Código | Significado | Descrição |
|--------|-------------|-----------|
| 200    | OK          | Requisição processada com sucesso |
| 400    | Bad Request | Parâmetro `discordId` ausente ou inválido |
| 500    | Internal Server Error | Erro interno do servidor |
| 503    | Service Unavailable | Bot não está pronto |

## 🔍 Validação de Discord ID

- Deve ser uma string numérica
- Deve ter entre 15-20 dígitos
- Formato: `123456789012345678`

## 💻 Exemplos de Uso

### JavaScript (Node.js)
```javascript
const axios = require('axios');

async function checkMember(discordId) {
    try {
        const response = await axios.get(`http://localhost:8080/check-member?discordId=${discordId}`);
        return response.data;
    } catch (error) {
        console.error('Erro:', error.response.data);
    }
}
```

### Python
```python
import requests

def check_member(discord_id):
    try:
        response = requests.get(f'http://localhost:8080/check-member?discordId={discord_id}')
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'Erro: {e}')
```

### cURL
```bash
curl "http://localhost:8080/check-member?discordId=123456789012345678"
```

## 🚀 Status do Servidor

Para verificar se o servidor está funcionando:
1. Acesse `http://localhost:8080/` no navegador
2. Verifique os logs do bot para confirmação
3. Use o endpoint `/health` para status programático

## 📊 Logs do Servidor

O servidor registra todas as requisições no console:
```
📥 GET /check-member - IP: ::1
📊 Verificação: 123456789012345678 - Não encontrado no servidor
✅ Verificação: 987654321098765432 (usuario#1234) - Encontrado no servidor
```

## 🎯 Casos de Uso

1. **Sistema de Verificação Externo:** Verificar se usuários têm acesso ao Discord antes de liberar funcionalidades
2. **Painel Web:** Criar painéis administrativos que verificam status dos membros
3. **Integrações:** Conectar sistemas externos com o servidor Discord
4. **Automação:** Scripts que verificam periodicamente o status de membros específicos

## ⚠️ Limitações

- A API só verifica membros do servidor configurado em `GUILD_ID`
- Requer que o bot tenha permissões para ver membros do servidor
- Funciona apenas na rede local (localhost) por padrão
- Discord IDs inválidos retornam erro 400

## 🔄 Monitoramento

O servidor inclui logs detalhados para monitoramento:
- Requisições recebidas
- Verificações de membros
- Erros e exceções
- Status do bot

---

**✨ Servidor criado como parte do sistema Scarlet ® - Manager**