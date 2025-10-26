# 📝 Exemplos de Uso - Bot Manager

## 🎯 Cenários Práticos

### 1. Novo Cliente Comprou uma Licença

**Situação:** Um cliente comprou acesso de 30 dias ao seu produto.

**Passos:**
1. Admin usa `/createkey`
   - Dias: `30`
   - Quantidade: `1`
   - Nível: `Premium`
   - Nota: `Cliente João - Compra #123`

2. Bot retorna a licença: `ABCD12-EFGH34-IJKL56-MNOP78`

3. Admin envia a licença para o cliente (privado)

4. Cliente entra no Discord e usa `/verify`
   - Insere a licença
   - Bot atribui roles automaticamente
   - Cliente ganha acesso aos canais

---

### 2. Cliente Solicita Suporte

**Situação:** Cliente está com dúvida sobre o produto.

**Passos:**
1. Cliente usa `/ticket`
2. Bot cria canal privado: `#ticket-cliente-1234`
3. Equipe de suporte é notificada
4. Suporte resolve o problema
5. Suporte ou cliente clica em "Fechar Ticket"
6. Canal é deletado após 5 segundos

---

### 3. Cliente Quer Renovar Assinatura

**Situação:** Cliente tem licença que vai expirar em breve.

**Passos:**
1. Cliente usa `/mylicense` para ver quando expira
2. Cliente efetua pagamento
3. Admin usa `/extendkey`
   - Licença: `ABCD12-EFGH34-IJKL56-MNOP78`
   - Dias: `30`
4. Bot adiciona 30 dias à licença existente
5. Cliente permanece com acesso sem interrupção

---

### 4. Cliente Solicitou Reembolso

**Situação:** Cliente pediu reembolso e você precisa revogar acesso.

**Passos:**
1. Admin usa `/deletekey`
   - Licença: `ABCD12-EFGH34-IJKL56-MNOP78`
2. Bot deleta a licença do KeyAuth
3. Bot remove roles do cliente automaticamente
4. Cliente perde acesso aos canais exclusivos
5. Ação é registrada nos logs

---

### 5. Verificar Status de Cliente

**Situação:** Admin quer verificar se licença de um cliente está ativa.

**Passos:**
1. Admin usa `/checkkey`
   - Licença: `ABCD12-EFGH34-IJKL56-MNOP78`
2. Bot mostra:
   - Status (Ativa/Expirada/Banida)
   - Data de criação
   - Data de expiração
   - Nível da licença
   - Nota associada

---

### 6. Listar Todas as Licenças

**Situação:** Admin quer ver todas as licenças cadastradas.

**Passos:**
1. Admin usa `/listkeys`
2. Bot mostra lista paginada de licenças
3. Para ver mais, use `/listkeys pagina:2`
4. Mostra status de cada licença

---

### 7. Ver Estatísticas do Servidor

**Situação:** Owner quer ver métricas do servidor.

**Passos:**
1. Admin usa `/stats`
2. Bot mostra:
   - Total de membros
   - Usuários verificados
   - Taxa de verificação
   - Tickets abertos/fechados
   - Informações do servidor

---

### 8. Cliente Novo no Servidor

**Situação:** Novo membro entra no servidor.

**Automático:**
1. Bot detecta entrada
2. Envia mensagem de boas-vindas
3. Explica como usar `/verify`
4. Registra entrada nos logs

---

### 9. Cliente Saiu do Servidor

**Situação:** Membro saiu do servidor.

**Automático:**
1. Bot detecta saída
2. Remove dados do usuário do database local
3. Registra saída nos logs
4. (Licença no KeyAuth permanece)

---

### 10. Promoção - Criar Várias Licenças

**Situação:** Promoção com 10 licenças de 7 dias gratuitas.

**Passos:**
1. Admin usa `/createkey`
   - Dias: `7`
   - Quantidade: `10`
   - Nível: `Básico`
   - Nota: `Promoção Black Friday 2025`
2. Bot gera 10 licenças diferentes
3. Admin distribui as licenças

---

## 🔍 Comandos Úteis para Debug

### Verificar se bot está respondendo:
```
/help
```

### Testar verificação (use licença de teste):
```
/verify licenca:SUA-LICENCA-TESTE
```

### Ver sua própria licença:
```
/mylicense
```

### Admin: Criar licença de teste:
```
/createkey dias:1 quantidade:1 nota:Teste
```

---

## ⚙️ Configurações Importantes

### `settings.json` - Personalizar Mensagens:
```json
{
  "messages": {
    "welcome": "Bem-vindo! Use /verify para acessar o conteúdo exclusivo.",
    "verifySuccess": "✅ Acesso liberado! Aproveite o conteúdo!",
    "verifyError": "❌ Licença inválida. Contate o suporte."
  }
}
```

### `.env` - Configurar Roles por Nível:
```env
# Diferentes roles para diferentes níveis
BASIC_ROLE_ID=111111111
PREMIUM_ROLE_ID=222222222
VIP_ROLE_ID=333333333
```

---

## 🚨 Situações de Emergência

### Bot está offline:
1. Verifique logs do terminal
2. Confirme que `DISCORD_TOKEN` está correto
3. Reinicie: `npm start`

### KeyAuth não responde:
1. Verifique `KEYAUTH_SELLER_KEY`
2. Confirme `KEYAUTH_APP_NAME`
3. Teste no dashboard do KeyAuth

### Comandos não funcionam:
1. Execute: `node deploy-commands.js`
2. Aguarde 1-2 minutos
3. Reinicie o Discord

---

## 💡 Dicas Profissionais

✅ **Crie licenças com notas descritivas** para identificar facilmente
✅ **Use /listkeys regularmente** para monitorar licenças
✅ **Configure canal de logs** para rastrear todas as ações
✅ **Faça backup do database** (pasta `data/`)
✅ **Teste com licença temporária** antes de dar para cliente

---

**Com essas práticas, seu servidor Discord + KeyAuth funcionará perfeitamente! 🎉**
