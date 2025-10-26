# 🎭 Exemplos de Máscaras - Sistema SCARLET

## ✅ **Máscaras Válidas:**

### **Formato Base:**
```
SCARLET-****-****-DURACAO
```

### **Exemplos Funcionais:**

#### 1. **Durações Diárias:**
```
SCARLET-abc1-def2-DIARIO
SCARLET-xyz9-123a-DIARIA
```

#### 2. **Durações Semanais:**
```
SCARLET-qwer-tyui-SEMANAL
SCARLET-zxcv-bnmm-SEMANAL
```

#### 3. **Durações Mensais:**
```
SCARLET-1234-abcd-MENSAL
SCARLET-5678-efgh-MENSAL
```

#### 4. **Durações Trimestrais:**
```
SCARLET-test-user-TRIMENSAL
SCARLET-demo-key1-TRIMESTRAL
```

#### 5. **Durações Vitalícias:**
```
SCARLET-life-time-LIFETIME
SCARLET-perm-accs-LIFETIME
```

## ❌ **Máscaras Inválidas:**

### **Prefixo Incorreto:**
```
GOLD-1234-5678-MENSAL     ❌ Deve começar com SCARLET
USER-abcd-efgh-SEMANAL    ❌ Deve começar com SCARLET
```

### **Formato de Grupos Incorreto:**
```
SCARLET-12-5678-MENSAL    ❌ Primeiro grupo muito pequeno
SCARLET-1234-56-MENSAL    ❌ Segundo grupo muito pequeno
SCARLET-12345-6789-MENSAL ❌ Grupos muito grandes
```

### **Caracteres Inválidos:**
```
SCARLET-12@4-5678-MENSAL  ❌ Caracteres especiais
SCARLET-12 4-5678-MENSAL  ❌ Espaços não permitidos
SCARLET-12#4-56*8-MENSAL  ❌ Símbolos não permitidos
```

### **Durações Inválidas:**
```
SCARLET-1234-5678-CUSTOM  ❌ Duração não reconhecida
SCARLET-1234-5678-ANUAL   ❌ Use TRIMESTRAL ou LIFETIME
SCARLET-1234-5678-WEEKLY  ❌ Use SEMANAL
```

## 🔧 **Comandos de Teste:**

### **Testar Máscara:**
```
/testmask SCARLET-test-1234-SEMANAL
```

### **Verificar com Máscara:**
```
/verify SCARLET-demo-user-MENSAL
```

## 📊 **Regras de Auto-Aprovação:**

### ✅ **Aprovação Automática** (usuários novos):
- Formato correto da máscara
- Usuário nunca foi removido do sistema
- Duração válida reconhecida

### 🔍 **Aprovação Manual** (usuários removidos):
- Formato correto da máscara
- Usuário foi removido anteriormente
- Requer aprovação de administrador

## 🎯 **Dicas de Uso:**

1. **Sempre teste** a máscara com `/testmask` antes de usar
2. **Durações equivalentes:** TRIMENSAL = TRIMESTRAL
3. **Case sensitive:** Use sempre MAIÚSCULAS para duração
4. **Apenas alfanuméricos:** Letras (a-z, A-Z) e números (0-9)
5. **Sem espaços ou símbolos** nos grupos de 4 caracteres

---

**Sistema desenvolvido para SCARLET® - Verificação por Máscara v1.0**