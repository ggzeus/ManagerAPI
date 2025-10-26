const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'data', 'database.json');
        this.ensureDatabase();
    }

    ensureDatabase() {
        const dataDir = path.join(__dirname, '..', 'data');
        
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        if (!fs.existsSync(this.dbPath)) {
            const initialData = {
                users: {},
                tickets: {},
                logs: [],
                removedUsers: {}, // Usuários que foram removidos
                pendingApprovals: {}, // Verificações pendentes de aprovação
                panels: {}, // Painéis de embed com ID único
                access: {}, // Sistemas de acesso com verificação de licença
                hwid: {}, // Sistemas de reset HWID
                entryLogs: {}, // Configurações de logs de entrada
                leftLogs: {} // Configurações de logs de saída
            };
            fs.writeFileSync(this.dbPath, JSON.stringify(initialData, null, 2));
        }
    }

    read() {
        try {
            const data = fs.readFileSync(this.dbPath, 'utf8');
            const parsed = JSON.parse(data);
            
            // Garantir que todas as propriedades existam
            if (!parsed.removedUsers) parsed.removedUsers = {};
            if (!parsed.pendingApprovals) parsed.pendingApprovals = {};
            if (!parsed.panels) parsed.panels = {};
            if (!parsed.access) parsed.access = {};
            if (!parsed.hwid) parsed.hwid = {};
            if (!parsed.entryLogs) parsed.entryLogs = {};
            if (!parsed.leftLogs) parsed.leftLogs = {};
            if (!parsed.downloads) parsed.downloads = {};
            if (!parsed.suggestions) parsed.suggestions = {};
            if (!parsed.arrange) parsed.arrange = {};
            if (!parsed.fixPanels) parsed.fixPanels = {};
            
            return parsed;
        } catch (error) {
            console.error('Erro ao ler database:', error);
            return { 
                users: {}, 
                tickets: {}, 
                logs: [], 
                removedUsers: {}, 
                pendingApprovals: {} 
            };
        }
    }

    write(data) {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Erro ao escrever no database:', error);
            return false;
        }
    }

    // Operações de usuários
    getUser(userId) {
        const data = this.read();
        return data.users[userId] || null;
    }

    saveUser(userId, userData) {
        const data = this.read();
        data.users[userId] = {
            ...userData,
            lastUpdated: new Date().toISOString()
        };
        return this.write(data);
    }

    deleteUser(userId) {
        const data = this.read();
        delete data.users[userId];
        return this.write(data);
    }

    getAllUsers() {
        const data = this.read();
        return data.users;
    }

    // Operações de tickets
    createTicket(channelId, userId, reason) {
        const data = this.read();
        data.tickets[channelId] = {
            userId: userId,
            reason: reason,
            createdAt: new Date().toISOString(),
            status: 'open'
        };
        return this.write(data);
    }

    getTicket(ticketId) {
        const data = this.read();
        return data.tickets[ticketId] || null;
    }

    updateTicket(ticketId, updates) {
        const data = this.read();
        if (data.tickets[ticketId]) {
            data.tickets[ticketId] = {
                ...data.tickets[ticketId],
                ...updates,
                lastUpdated: new Date().toISOString()
            };
            return this.write(data);
        }
        return false;
    }

    closeTicket(ticketId) {
        return this.updateTicket(ticketId, { 
            status: 'closed',
            closedAt: new Date().toISOString()
        });
    }

    getUserTickets(userId) {
        const data = this.read();
        return Object.entries(data.tickets)
            .filter(([_, ticket]) => ticket.userId === userId)
            .map(([id, ticket]) => ({ id, ...ticket }));
    }

    getUserTicket(userId) {
        const data = this.read();
        const userTickets = Object.entries(data.tickets)
            .filter(([_, ticket]) => ticket.userId === userId && ticket.status === 'open')
            .map(([id, ticket]) => ({ channelId: id, ...ticket }));
        
        return userTickets[0] || null; // Retorna o primeiro ticket ativo ou null
    }

    // Operações de logs
    addLog(logData) {
        const data = this.read();
        data.logs.push({
            ...logData,
            timestamp: new Date().toISOString()
        });
        
        // Manter apenas os últimos 1000 logs
        if (data.logs.length > 1000) {
            data.logs = data.logs.slice(-1000);
        }
        
        return this.write(data);
    }

    getLogs(limit = 50) {
        const data = this.read();
        return data.logs.slice(-limit);
    }

    getLogsByUser(userId, limit = 50) {
        const data = this.read();
        return data.logs
            .filter(log => log.userId === userId)
            .slice(-limit);
    }

    // Operações de usuários removidos
    addRemovedUser(userId, removalData) {
        const data = this.read();
        data.removedUsers[userId] = {
            ...removalData,
            removedAt: new Date().toISOString()
        };
        return this.write(data);
    }

    isUserRemoved(userId) {
        const data = this.read();
        return !!data.removedUsers[userId];
    }

    getRemovedUser(userId) {
        const data = this.read();
        return data.removedUsers[userId] || null;
    }

    removeFromRemovedList(userId) {
        const data = this.read();
        delete data.removedUsers[userId];
        return this.write(data);
    }

    // Operações de aprovações pendentes
    addPendingApproval(userId, approvalData) {
        const data = this.read();
        data.pendingApprovals[userId] = {
            ...approvalData,
            requestedAt: new Date().toISOString(),
            status: 'pending'
        };
        return this.write(data);
    }

    getPendingApproval(userId) {
        const data = this.read();
        return data.pendingApprovals[userId] || null;
    }

    getAllPendingApprovals() {
        const data = this.read();
        return data.pendingApprovals;
    }

    approvePendingUser(userId, approvedBy) {
        const data = this.read();
        if (data.pendingApprovals[userId]) {
            data.pendingApprovals[userId].status = 'approved';
            data.pendingApprovals[userId].approvedBy = approvedBy;
            data.pendingApprovals[userId].approvedAt = new Date().toISOString();
            return this.write(data);
        }
        return false;
    }

    rejectPendingUser(userId, rejectedBy, reason) {
        const data = this.read();
        if (data.pendingApprovals[userId]) {
            data.pendingApprovals[userId].status = 'rejected';
            data.pendingApprovals[userId].rejectedBy = rejectedBy;
            data.pendingApprovals[userId].rejectedAt = new Date().toISOString();
            data.pendingApprovals[userId].rejectionReason = reason;
            return this.write(data);
        }
        return false;
    }

    removePendingApproval(userId) {
        const data = this.read();
        delete data.pendingApprovals[userId];
        return this.write(data);
    }

    // ===== MÉTODOS PARA PAINÉIS =====
    
    /**
     * Criar um novo painel
     */
    createPanel(panelId, channelId, messageId = null) {
        const data = this.read();
        data.panels[panelId] = {
            id: panelId,
            channelId: channelId,
            messageId: messageId,
            title: 'Painel Padrão',
            description: 'Descrição do painel',
            color: '#3498db',
            footer: null,
            banner: null,
            thumbnail: null,
            author: null,
            timestamp: true,
            fields: [],
            buttons: [],
            selectOptions: [], // Opções do select menu
            hasSelectMenu: false, // Se tem select menu
            createdAt: new Date().toISOString(),
            lastSync: new Date().toISOString()
        };
        this.write(data);
        return data.panels[panelId];
    }

    /**
     * Obter painel por ID
     */
    getPanel(panelId) {
        const data = this.read();
        return data.panels[panelId] || null;
    }

    /**
     * Atualizar configurações do painel
     */
    updatePanel(panelId, config) {
        const data = this.read();
        if (data.panels[panelId]) {
            Object.assign(data.panels[panelId], config);
            data.panels[panelId].lastSync = new Date().toISOString();
            this.write(data);
            return data.panels[panelId];
        }
        return null;
    }

    /**
     * Atualizar messageId do painel (após sincronização)
     */
    updatePanelMessage(panelId, messageId) {
        const data = this.read();
        if (data.panels[panelId]) {
            data.panels[panelId].messageId = messageId;
            data.panels[panelId].lastSync = new Date().toISOString();
            this.write(data);
            return true;
        }
        return false;
    }

    /**
     * Deletar painel
     */
    deletePanel(panelId) {
        const data = this.read();
        if (data.panels[panelId]) {
            delete data.panels[panelId];
            this.write(data);
            return true;
        }
        return false;
    }

    /**
     * Listar todos os painéis
     */
    getAllPanels() {
        const data = this.read();
        return Object.values(data.panels);
    }

    // ============= MÉTODOS DE SISTEMA DE ACESSO =============

    /**
     * Criar um novo sistema de acesso
     */
    createAccess(accessData) {
        const data = this.read();
        data.access[accessData.id] = accessData;
        this.write(data);
        return true;
    }

    /**
     * Obter um sistema de acesso por ID
     */
    getAccess(accessId) {
        const data = this.read();
        return data.access[accessId] || null;
    }

    /**
     * Atualizar um sistema de acesso
     */
    updateAccess(accessId, updates) {
        const data = this.read();
        if (data.access[accessId]) {
            data.access[accessId] = { ...data.access[accessId], ...updates };
            this.write(data);
            return true;
        }
        return false;
    }

    /**
     * Deletar um sistema de acesso
     */
    deleteAccess(accessId) {
        const data = this.read();
        if (data.access[accessId]) {
            delete data.access[accessId];
            this.write(data);
            return true;
        }
        return false;
    }

    /**
     * Listar todos os sistemas de acesso
     */
    getAllAccess() {
        const data = this.read();
        return Object.values(data.access);
    }

    /**
     * Registrar acesso temporário de usuário
     */
    setTemporaryAccess(userId, duration, keyInfo) {
        const data = this.read();
        if (!data.temporaryAccess) data.temporaryAccess = {};
        
        const expiresAt = new Date(Date.now() + (duration * 1000)).toISOString();
        
        data.temporaryAccess[userId] = {
            keyUsed: keyInfo.key,
            duration: duration,
            grantedAt: new Date().toISOString(),
            expiresAt: expiresAt,
            keyDetails: keyInfo
        };
        
        this.write(data);
        return expiresAt;
    }

    /**
     * Verificar se usuário tem acesso temporário válido
     */
    hasValidTemporaryAccess(userId) {
        const data = this.read();
        if (!data.temporaryAccess || !data.temporaryAccess[userId]) {
            return false;
        }
        
        const access = data.temporaryAccess[userId];
        const now = new Date();
        const expires = new Date(access.expiresAt);
        
        return now < expires;
    }

    /**
     * Remover acesso temporário expirado
     */
    removeExpiredAccess(userId) {
        const data = this.read();
        if (data.temporaryAccess && data.temporaryAccess[userId]) {
            delete data.temporaryAccess[userId];
            this.write(data);
            return true;
        }
        return false;
    }

    /**
     * Remover acesso temporário (alias para removeExpiredAccess)
     */
    removeTemporaryAccess(userId) {
        return this.removeExpiredAccess(userId);
    }

    // ============= MÉTODOS DE SISTEMA DE HWID =============

    /**
     * Criar um novo sistema de HWID
     */
    createHwid(hwidData) {
        const data = this.read();
        data.hwid[hwidData.id] = hwidData;
        this.write(data);
        return true;
    }

    /**
     * Obter um sistema de HWID por ID
     */
    getHwid(hwidId) {
        const data = this.read();
        return data.hwid[hwidId] || null;
    }

    /**
     * Atualizar um sistema de HWID
     */
    updateHwid(hwidId, updates) {
        const data = this.read();
        if (data.hwid[hwidId]) {
            data.hwid[hwidId] = { ...data.hwid[hwidId], ...updates };
            this.write(data);
            return true;
        }
        return false;
    }

    /**
     * Deletar um sistema de HWID
     */
    deleteHwid(hwidId) {
        const data = this.read();
        if (data.hwid[hwidId]) {
            delete data.hwid[hwidId];
            this.write(data);
            return true;
        }
        return false;
    }

    /**
     * Criar processo de reset HWID
     */
    createHwidProcess(channelId, userId, hwidSystemId) {
        const data = this.read();
        if (!data.hwidProcesses) data.hwidProcesses = {};
        
        data.hwidProcesses[channelId] = {
            userId: userId,
            hwidSystemId: hwidSystemId,
            step: 1,
            username: null,
            reason: null,
            proofImage: null,
            createdAt: new Date().toISOString()
        };
        
        this.write(data);
        return true;
    }

    /**
     * Obter processo de reset HWID
     */
    getHwidProcess(channelId) {
        const data = this.read();
        return data.hwidProcesses && data.hwidProcesses[channelId] ? data.hwidProcesses[channelId] : null;
    }

    /**
     * Atualizar processo de reset HWID
     */
    updateHwidProcess(channelId, updates) {
        const data = this.read();
        if (data.hwidProcesses && data.hwidProcesses[channelId]) {
            data.hwidProcesses[channelId] = { ...data.hwidProcesses[channelId], ...updates };
            this.write(data);
            return true;
        }
        return false;
    }

    /**
     * Deletar processo de reset HWID
     */
    deleteHwidProcess(channelId) {
        const data = this.read();
        if (data.hwidProcesses && data.hwidProcesses[channelId]) {
            delete data.hwidProcesses[channelId];
            this.write(data);
            return true;
        }
        return false;
    }

    // ============= MÉTODOS DE LOGS DE ENTRADA/SAÍDA =============

    /**
     * Definir status dos logs de entrada
     */
    setEntryLogStatus(guildId, config) {
        const data = this.read();
        if (config) {
            data.entryLogs[guildId] = config;
        } else {
            delete data.entryLogs[guildId];
        }
        this.write(data);
        return true;
    }

    /**
     * Obter status dos logs de entrada
     */
    getEntryLogStatus(guildId) {
        const data = this.read();
        return data.entryLogs[guildId] || null;
    }

    /**
     * Definir status dos logs de saída
     */
    setLeftLogStatus(guildId, config) {
        const data = this.read();
        if (config) {
            data.leftLogs[guildId] = config;
        } else {
            delete data.leftLogs[guildId];
        }
        this.write(data);
        return true;
    }

    /**
     * Obter status dos logs de saída
     */
    getLeftLogStatus(guildId) {
        const data = this.read();
        return data.leftLogs[guildId] || null;
    }

    // ========== MÉTODOS DE DOWNLOAD ==========
    
    /**
     * Configurar painel de download
     */
    setDownloadConfig(guildId, channelId, config) {
        const data = this.read();
        if (!data.downloads[guildId]) {
            data.downloads[guildId] = {};
        }
        data.downloads[guildId][channelId] = {
            title: config.title || '📥 Download Menu',
            description: config.description || 'Clique no botão abaixo para baixar o menu',
            color: config.color || '#00ff00',
            fileName: config.fileName || 'menu.rar',
            fileUrl: config.fileUrl || null,
            buttonText: config.buttonText || '📥 Baixar Menu',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.write(data);
        return true;
    }

    /**
     * Obter configuração de download
     */
    getDownloadConfig(guildId, channelId) {
        const data = this.read();
        return data.downloads[guildId]?.[channelId] || null;
    }

    /**
     * Listar todas as configurações de download de um servidor
     */
    getAllDownloadConfigs(guildId) {
        const data = this.read();
        return data.downloads[guildId] || {};
    }

    /**
     * Remover configuração de download
     */
    removeDownloadConfig(guildId, channelId) {
        const data = this.read();
        if (data.downloads[guildId] && data.downloads[guildId][channelId]) {
            delete data.downloads[guildId][channelId];
            this.write(data);
            return true;
        }
        return false;
    }

    /**
     * Atualizar apenas o arquivo de download
     */
    updateDownloadFile(guildId, channelId, fileName, fileUrl) {
        const data = this.read();
        if (data.downloads[guildId] && data.downloads[guildId][channelId]) {
            data.downloads[guildId][channelId].fileName = fileName;
            data.downloads[guildId][channelId].fileUrl = fileUrl;
            data.downloads[guildId][channelId].updatedAt = new Date().toISOString();
            this.write(data);
            return true;
        }
        return false;
    }

    // ========== MÉTODOS DE SUGESTÕES ==========
    
    /**
     * Configurar status de sugestões em um canal
     */
    setSuggestionStatus(guildId, channelId, enabled) {
        const data = this.read();
        if (!data.suggestions[guildId]) {
            data.suggestions[guildId] = {};
        }
        
        if (enabled) {
            data.suggestions[guildId][channelId] = {
                enabled: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } else {
            delete data.suggestions[guildId][channelId];
        }
        
        this.write(data);
        return true;
    }

    /**
     * Verificar se sugestões estão habilitadas em um canal
     */
    isSuggestionEnabled(guildId, channelId) {
        const data = this.read();
        return data.suggestions[guildId]?.[channelId]?.enabled || false;
    }

    /**
     * Obter todos os canais com sugestões habilitadas em um servidor
     */
    getSuggestionChannels(guildId) {
        const data = this.read();
        return data.suggestions[guildId] || {};
    }

    /**
     * Remover configuração de sugestões de um canal
     */
    removeSuggestionChannel(guildId, channelId) {
        const data = this.read();
        if (data.suggestions[guildId] && data.suggestions[guildId][channelId]) {
            delete data.suggestions[guildId][channelId];
            this.write(data);
            return true;
        }
        return false;
    }

    // ========== MÉTODOS DE ARRANGE (REPORTES) ==========
    
    /**
     * Configurar status de arrange em um canal
     */
    setArrangeStatus(guildId, channelId, enabled) {
        const data = this.read();
        if (!data.arrange[guildId]) {
            data.arrange[guildId] = {};
        }
        
        if (enabled) {
            data.arrange[guildId][channelId] = {
                enabled: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } else {
            delete data.arrange[guildId][channelId];
        }
        
        this.write(data);
        return true;
    }

    /**
     * Verificar se arrange está habilitado em um canal
     */
    isArrangeEnabled(guildId, channelId) {
        const data = this.read();
        return data.arrange[guildId]?.[channelId]?.enabled || false;
    }

    /**
     * Obter todos os canais com arrange habilitado em um servidor
     */
    getArrangeChannels(guildId) {
        const data = this.read();
        return data.arrange[guildId] || {};
    }

    /**
     * Remover configuração de arrange de um canal
     */
    removeArrangeChannel(guildId, channelId) {
        const data = this.read();
        if (data.arrange[guildId] && data.arrange[guildId][channelId]) {
            delete data.arrange[guildId][channelId];
            this.write(data);
            return true;
        }
        return false;
    }

    // ========== MÉTODOS DE FIX PANELS ==========
    
    /**
     * Criar/atualizar painel de fix
     */
    setFixPanel(guildId, channelId, config) {
        const data = this.read();
        if (!data.fixPanels[guildId]) {
            data.fixPanels[guildId] = {};
        }
        
        data.fixPanels[guildId][channelId] = {
            title: config.title || '🔧 Sistema de Fix',
            description: config.description || 'Selecione uma categoria abaixo',
            color: config.color || '#00ff00',
            categories: config.categories || {},
            createdAt: config.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.write(data);
        return true;
    }

    /**
     * Obter configuração de painel de fix
     */
    getFixPanel(guildId, channelId) {
        const data = this.read();
        return data.fixPanels[guildId]?.[channelId] || null;
    }

    /**
     * Adicionar categoria ao painel
     */
    addFixCategory(guildId, channelId, categoryId, categoryData) {
        const data = this.read();
        if (data.fixPanels[guildId] && data.fixPanels[guildId][channelId]) {
            if (!data.fixPanels[guildId][channelId].categories) {
                data.fixPanels[guildId][channelId].categories = {};
            }
            
            data.fixPanels[guildId][channelId].categories[categoryId] = {
                name: categoryData.name,
                emoji: categoryData.emoji || '🔧',
                subTitle: categoryData.subTitle || 'Subcategorias',
                subDescription: categoryData.subDescription || 'Selecione uma opção',
                subColor: categoryData.subColor || '#0099ff',
                subcategories: categoryData.subcategories || {}
            };
            
            data.fixPanels[guildId][channelId].updatedAt = new Date().toISOString();
            this.write(data);
            return true;
        }
        return false;
    }

    /**
     * Adicionar subcategoria
     */
    addFixSubcategory(guildId, channelId, categoryId, subId, subData) {
        const data = this.read();
        if (data.fixPanels[guildId] && 
            data.fixPanels[guildId][channelId] && 
            data.fixPanels[guildId][channelId].categories[categoryId]) {
            
            if (!data.fixPanels[guildId][channelId].categories[categoryId].subcategories) {
                data.fixPanels[guildId][channelId].categories[categoryId].subcategories = {};
            }
            
            data.fixPanels[guildId][channelId].categories[categoryId].subcategories[subId] = {
                name: subData.name,
                emoji: subData.emoji || '🔹',
                response: subData.response || 'Resposta não configurada'
            };
            
            data.fixPanels[guildId][channelId].updatedAt = new Date().toISOString();
            this.write(data);
            return true;
        }
        return false;
    }

    /**
     * Remover painel de fix
     */
    removeFixPanel(guildId, channelId) {
        const data = this.read();
        if (data.fixPanels[guildId] && data.fixPanels[guildId][channelId]) {
            delete data.fixPanels[guildId][channelId];
            this.write(data);
            return true;
        }
        return false;
    }

    /**
     * Listar todos os painéis de fix de um servidor
     */
    getAllFixPanels(guildId) {
        const data = this.read();
        return data.fixPanels[guildId] || {};
    }
}

module.exports = new Database();
