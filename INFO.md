# 🤖 Bot Manager - KeyAuth + Discord

Bot completo para gerenciamento de clientes Discord integrado com KeyAuth SellerAPI

## ✨ Recursos Principais

- ✅ Verificação automática de licenças
- 🔑 Gerenciamento completo de licenças (criar, deletar, estender)
- 🎫 Sistema de tickets para suporte
- 📊 Dashboard de estatísticas
- 📝 Sistema de logs completo
- 🎯 Atribuição automática de roles
- 🔄 Verificação periódica de licenças

## 📦 Comandos Disponíveis

### 👥 Usuários
- `/verify` - Verificar licença
- `/mylicense` - Ver sua licença
- `/ticket` - Abrir ticket de suporte
- `/help` - Ajuda

### 🛠️ Administradores
- `/createkey` - Criar licença(s)
- `/deletekey` - Deletar licença
- `/extendkey` - Estender licença
- `/checkkey` - Verificar licença
- `/listkeys` - Listar todas licenças
- `/stats` - Estatísticas

## 🚀 Instalação Rápida

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o arquivo `.env`:**
   - Copie `.env.example` para `.env`
   - Preencha com suas credenciais

3. **Registre os comandos:**
   ```bash
   node deploy-commands.js
   ```

4. **Inicie o bot:**
   ```bash
   npm start
   ```

## 📖 Documentação

- **Guia Completo:** Veja `README.md`
- **Início Rápido:** Veja `INICIO-RAPIDO.md`

## 🔧 Tecnologias

- Discord.js v14
- KeyAuth SellerAPI
- Node.js
- Sistema de database local (JSON)

---

**Desenvolvido para facilitar o gerenciamento de clientes via Discord**
