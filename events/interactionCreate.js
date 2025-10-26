const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, SelectMenuBuilder } = require('discord.js');
const database = require('../utils/database');
const Logger = require('../utils/logger');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Map para armazenar timers de expiração por usuário
const accessTimers = new Map();

// Função auxiliar para responder interação de forma segura
async function safeReply(interaction, options) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp(options);
        } else {
            return await interaction.reply(options);
        }
    } catch (error) {
        console.error('Erro ao responder interação:', error);
        // Se ainda não conseguiu responder, tenta followUp
        try {
            if (!interaction.replied) {
                return await interaction.followUp(options);
            }
        } catch (e) {
            console.error('Erro final ao responder:', e);
        }
    }
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        try {
            // Handler para botões
            if (interaction.isButton()) {
            // Verificar se a interação já foi processada
            if (interaction.replied || interaction.deferred) {
                return;
            }

            // Botões de aprovação de verificação
            if (interaction.customId.startsWith('approve_') || 
                interaction.customId.startsWith('reject_') || 
                interaction.customId.startsWith('remove_verification_')) {
                
                // Verificar se é admin
                if (!interaction.member.permissions.has('Administrator')) {
                    return interaction.reply({
                        content: '❌ Apenas administradores podem usar estes botões.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const userId = interaction.customId.split('_')[1];
                
                if (interaction.customId.startsWith('approve_')) {
                    await handleApproveUser(interaction, client, userId);
                } else if (interaction.customId.startsWith('reject_')) {
                    await handleRejectUser(interaction, client, userId);
                } else if (interaction.customId.startsWith('remove_verification_')) {
                    await handleRemoveVerification(interaction, client, userId);
                }
                return;
            }
            
            // Sistema de Gerenciamento de Keys
            if (interaction.customId === 'manage_keys') {
                await handleManageKeys(interaction, client);
                return;
            }
            
            if (interaction.customId === 'manage_users') {
                await handleManageUsers(interaction, client);
                return;
            }
            
            // Botões de gerenciamento de keys
            if (interaction.customId.startsWith('key_')) {
                await handleKeyManagementButtons(interaction, client);
                return;
            }
            
            // Botões de gerenciamento de usuários
            if (interaction.customId.startsWith('user_')) {
                await handleUserManagementButtons(interaction, client);
                return;
            }
            
            // Botão de copiar key
            if (interaction.customId.startsWith('copy_key_')) {
                await handleCopyKey(interaction, client);
                return;
            }

            // Botões de verificação de acesso
            if (interaction.customId.startsWith('access_verify_key_')) {
                await handleAccessVerificationKey(interaction, client);
                return;
            }
            
            if (interaction.customId.startsWith('access_verify_login_')) {
                await handleAccessVerificationLogin(interaction, client);
                return;
            }
            
            // Manter compatibilidade com sistema antigo
            if (interaction.customId.startsWith('access_verify_')) {
                await handleAccessVerification(interaction, client);
                return;
            }
            
            // Botões de download de menu
            if (interaction.customId.startsWith('download_menu_')) {
                await handleDownloadMenu(interaction, client);
                return;
            }
            
            // Botões de reset HWID
            if (interaction.customId.startsWith('hwid_reset_')) {
                await handleHwidReset(interaction, client);
                return;
            }
            
            // Botões de aprovação/recusa HWID
            if (interaction.customId.startsWith('hwid_approve_') || interaction.customId.startsWith('hwid_reject_')) {
                await handleHwidApproval(interaction, client);
                return;
            }
            
            // Sistema de Fix - Configuração
            if (interaction.customId.startsWith('fix_')) {
                await handleFixInteraction(interaction, client);
                return;
            }
            
            // Botões de ticket
            if (interaction.customId === 'leave_ticket') {
                // Sair do ticket - remover permissões do usuário
                await handleLeaveTicket(interaction, client);
                return;
            }

            if (interaction.customId === 'ticket_member') {
                // Painel do membro - placeholder
                return interaction.reply({
                    content: '👤 Painel do membro em desenvolvimento.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.customId === 'ticket_staff') {
                // Painel staff - placeholder
                return interaction.reply({
                    content: '🛠️ Painel staff em desenvolvimento.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.customId === 'assume_ticket') {
                // Assumir ticket
                await handleAssumeTicket(interaction, client);
                return;
            }

            // Fechar ticket
            if (interaction.customId === 'close_ticket') {
                // Verificar se a interação já foi processada
                if (interaction.replied || interaction.deferred) {
                    return;
                }

                const ticket = database.getTicket(interaction.channel.id);
                
                if (!ticket) {
                    return interaction.reply({
                        content: '❌ Este não é um canal de ticket válido.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Verificar permissões
                const isTicketOwner = ticket.userId === interaction.user.id;
                const isAdmin = interaction.member.permissions.has('Administrator');
                const supportRoleId = client.settings.ticketSettings?.supportRoleId;
                const hasSupport = supportRoleId && interaction.member.roles.cache.has(supportRoleId);

                if (!isTicketOwner && !isAdmin && !hasSupport) {
                    return interaction.reply({
                        content: '❌ Você não tem permissão para fechar este ticket.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                await interaction.deferReply();

                try {
                    // Criar transcript (opcional - simplificado)
                    const closeEmbed = new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('🔒 Ticket Fechado')
                        .setDescription(`Este ticket foi fechado por ${interaction.user.tag}`)
                        .addFields(
                            { name: 'Dono do Ticket', value: `<@${ticket.userId}>`, inline: true },
                            { name: 'Fechado por', value: `${interaction.user.tag}`, inline: true },
                            { name: 'Fechado em', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                        )
                        .setTimestamp();

                    await interaction.editReply({ embeds: [closeEmbed] });

                    // Atualizar status no database
                    database.closeTicket(interaction.channel.id);

                    // Log
                    const logger = new Logger(client);
                    const ticketOwner = await client.users.fetch(ticket.userId);
                    await logger.logTicketClose(ticketOwner, interaction.channel, interaction.user);

                    // Deletar canal após 5 segundos
                    setTimeout(async () => {
                        try {
                            await interaction.channel.delete();
                        } catch (error) {
                            console.error('Erro ao deletar canal:', error);
                        }
                    }, 5000);

                } catch (error) {
                    console.error('Erro ao fechar ticket:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '❌ Erro ao fechar o ticket.',
                            flags: MessageFlags.Ephemeral
                        });
                    } else {
                        await interaction.editReply({
                            content: '❌ Erro ao fechar o ticket.'
                        }).catch(() => {});
                    }
                }
            }
        }

        // Handler para Modais de licença
        if (interaction.isModalSubmit()) {
            // Modais de gerenciamento de keys
            if (interaction.customId.startsWith('key_modal_')) {
                await handleKeyModals(interaction, client);
                return;
            }
            
            // Modais de gerenciamento de usuários
            if (interaction.customId.startsWith('user_modal_')) {
                await handleUserModals(interaction, client);
                return;
            }
            
            if (interaction.customId.startsWith('access_key_')) {
                await handleLicenseKeySubmission(interaction, client);
                return;
            }
            if (interaction.customId.startsWith('access_login_')) {
                await handleLoginSubmission(interaction, client);
                return;
            }
            if (interaction.customId.startsWith('hwid_reject_reason_')) {
                await handleHwidRejectReason(interaction, client);
                return;
            }
            if (interaction.customId.startsWith('config_download_')) {
                await handleDownloadConfigModal(interaction, client);
                return;
            }
            if (interaction.customId.startsWith('fix_modal_')) {
                await handleFixModal(interaction, client);
                return;
            }
        }

        // Handler para Select Menus (painéis)
        if (interaction.isStringSelectMenu()) {
            // Verificar se é um select menu de painel
            if (interaction.customId.endsWith('_select')) {
                await handlePanelSelectMenu(interaction, client);
                return;
            }
        }

        // Handler para mensagens em canais de HWID
        if (interaction.isMessage && interaction.channel.name.startsWith('⛔・')) {
            await handleHwidMessage(interaction, client);
            return;
        }

        // Handler para comandos slash
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Comando ${interaction.commandName} não encontrado.`);
                return;
            }

            try {
                await command.execute(interaction, interaction.client);
            } catch (error) {
                console.error('Erro ao executar comando:', error);
                
                // Verificar se a interação ainda é válida antes de tentar responder
                if (!interaction.replied && !interaction.deferred) {
                    try {
                        await interaction.reply({
                            content: '❌ Houve um erro ao executar este comando.',
                            flags: MessageFlags.Ephemeral
                        });
                    } catch (replyError) {
                        console.error('Erro ao responder interação:', replyError);
                    }
                }
            }
        }
        } catch (globalError) {
            console.error('❌ Erro global do handler:', globalError);
            // Não tentar responder aqui pois pode já ter sido respondido
        }
    },
};

// Função para aprovar usuário
async function handleApproveUser(interaction, client, userId) {
    // Verificar se a interação já foi respondida
    if (interaction.replied || interaction.deferred) {
        return;
    }
    
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const pendingApproval = database.getPendingApproval(userId);
        
        if (!pendingApproval) {
            return interaction.editReply({
                content: '❌ Aprovação não encontrada ou já processada.'
            });
        }

        // Buscar o usuário
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return interaction.editReply({
                content: '❌ Usuário não encontrado.'
            });
        }

        // Buscar membro no servidor
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!member) {
            return interaction.editReply({
                content: '❌ Usuário não está no servidor.'
            });
        }

        // Adicionar role de verificado
        const verifiedRoleId = client.settings.verifiedRoleId;
        if (verifiedRoleId) {
            await member.roles.add(verifiedRoleId);
        }

        // Adicionar ao database como verificado
        database.addUser(userId, pendingApproval.licenseKey, 'verified_manual');
        
        // Remover das aprovações pendentes e usuários removidos
        database.removePendingApproval(userId);
        database.removeRemovedUser(userId);

        // Atualizar o embed original para mostrar que foi aprovado
        const approvedEmbed = new EmbedBuilder()
            .setColor('#27ae60')
            .setTitle('✅ Usuário Aprovado')
            .setDescription(`**${user.tag}** foi aprovado e verificado.`)
            .addFields(
                { name: 'Chave', value: `\`${pendingApproval.licenseKey}\``, inline: true },
                { name: 'Aprovado por', value: `${interaction.user.tag}`, inline: true }
            )
            .setTimestamp();

        await interaction.message.edit({ 
            embeds: [approvedEmbed], 
            components: [] 
        });

        // Log
        const logger = new Logger(client);
        await logger.logVerification(user, pendingApproval.licenseKey, 'manual_approval');

        await interaction.editReply({
            content: `✅ ${user.tag} foi aprovado e verificado com sucesso!`
        });

    } catch (error) {
        console.error('Erro ao aprovar usuário:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Erro ao aprovar usuário.',
                flags: MessageFlags.Ephemeral
            });
        } else {
            await interaction.editReply({
                content: '❌ Erro ao aprovar usuário.'
            }).catch(() => {});
        }
    }
}

// Função para processar submissão de chave de licença
async function processUserApprovalWithDuration(interaction, client, access, identifier, licenseInfo, durationInSeconds, extraInfo = {}) {
    try {
        // Verificar se o usuário já tem o cargo antes de adicionar
        const roleId = '1431641793488752812'; // VERIFIED_ROLE_ID
        const role = interaction.guild.roles.cache.get(roleId);
        
        if (!role) {
            console.error('Role de verificação não encontrado:', roleId);
            return await interaction.editReply({
                content: '❌ Cargo de acesso não encontrado. Contate um administrador.'
            });
        }

        // Verificar se o usuário já tem o cargo
        const alreadyHasRole = interaction.member.roles.cache.has(roleId);
        console.log('Usuário já tem o cargo:', alreadyHasRole);

        if (!alreadyHasRole) {
            await interaction.member.roles.add(role);
            console.log('Cargo adicionado para:', interaction.user.tag);
        } else {
            console.log('Usuário já possui o cargo, apenas atualizando tempo de acesso');
        }

        // Registrar acesso temporário no database
        const expiresAt = database.setTemporaryAccess(interaction.user.id, durationInSeconds, {
            method: licenseInfo.startsWith('login:') ? 'login' : 'key',
            identifier: identifier,
            ...extraInfo
        });

        // Cancelar timer existente se houver
        if (accessTimers.has(interaction.user.id)) {
            clearTimeout(accessTimers.get(interaction.user.id));
            console.log('Timer anterior cancelado para:', interaction.user.tag);
        }

        // Agendar remoção do cargo
        console.log('Agendando remoção do cargo em:', durationInSeconds, 'segundos');
        console.log('Isso equivale a:', Math.floor(durationInSeconds / 86400), 'dias');
        console.log('Timer será acionado em:', new Date(Date.now() + (durationInSeconds * 1000)).toLocaleString('pt-BR'));
        
        const timer = setTimeout(async () => {
            try {
                console.log('Executando remoção do cargo para:', interaction.user.tag);
                const member = await interaction.guild.members.fetch(interaction.user.id);
                
                // Verificar se o acesso ainda está válido (pode ter sido renovado)
                if (!database.hasValidTemporaryAccess(interaction.user.id)) {
                    if (member && member.roles.cache.has(roleId)) {
                        await member.roles.remove(role);
                        console.log('Cargo removido automaticamente para:', member.user.tag);
                        
                        // Notificar usuário (opcional)
                        try {
                            await member.send('⏰ Seu acesso temporário expirou e foi removido.');
                        } catch (dmError) {
                            console.log('Não foi possível enviar DM para:', member.user.tag);
                        }
                    }
                    database.removeExpiredAccess(interaction.user.id);
                } else {
                    console.log('Acesso ainda válido, não removendo cargo para:', interaction.user.tag);
                }
                
                // Remover timer do map
                accessTimers.delete(interaction.user.id);
            } catch (error) {
                console.error('Erro ao remover acesso expirado:', error);
                accessTimers.delete(interaction.user.id);
            }
        }, durationInSeconds * 1000);
        
        // Armazenar timer no map
        accessTimers.set(interaction.user.id, timer);

        // Resposta de sucesso
        const method = licenseInfo.startsWith('login:') ? 'Login' : 'Chave';
        const expiryDate = new Date(expiresAt).toLocaleString('pt-BR');
        
        await interaction.editReply({
            content: [
                '✅ **Acesso liberado com sucesso!**',
                '',
                `🔑 **Método:** ${method}`,
                `👤 **Identificador:** \`${identifier}\``,
                `⏰ **Duração:** ${Math.floor(durationInSeconds / 86400)} dias`,
                `📅 **Expira em:** ${expiryDate}`,
                `🎭 **Cargo adicionado:** ${role.name}`,
                '',
                '🎉 **Bem-vindo(a) ao servidor!**'
            ].join('\n')
        });

        // Log da verificação
        const Logger = require('../utils/logger.js');
        const logger = new Logger(client);
        await logger.logAccessGrant({
            userId: interaction.user.id,
            method: method,
            identifier: identifier,
            duration: durationInSeconds,
            expiresAt: expiresAt,
            accessId: access.id
        });

        console.log(`✅ Acesso concedido para ${interaction.user.tag} via ${method} (${identifier})`);
        
    } catch (error) {
        console.error('Erro ao processar aprovação:', error);
        await interaction.editReply({
            content: '❌ Erro ao liberar acesso. Tente novamente.'
        });
    }
}

async function processUserApproval(interaction, client, access, username, licenseInfo) {
    try {
        // Verificar se o usuário já tem o cargo antes de adicionar
        const roleId = '1431641793488752812'; // VERIFIED_ROLE_ID
        const role = interaction.guild.roles.cache.get(roleId);
        
        if (!role) {
            console.error('Role de verificação não encontrado:', roleId);
            return await interaction.editReply({
                content: '❌ Cargo de acesso não encontrado. Contate um administrador.'
            });
        }

        // Verificar se o usuário já tem o cargo
        const alreadyHasRole = interaction.member.roles.cache.has(roleId);
        console.log('Usuário já tem o cargo:', alreadyHasRole);

        if (!alreadyHasRole) {
            await interaction.member.roles.add(role);
            console.log('Cargo adicionado para:', interaction.user.tag);
        } else {
            console.log('Usuário já possui o cargo, apenas atualizando tempo de acesso');
        }

        // Definir duração padrão de 30 dias para login (30 * 24 * 60 * 60 = 2592000 segundos)
        const durationInSeconds = 2592000; // 30 dias

        // Registrar acesso temporário no database
        const expiresAt = database.setTemporaryAccess(interaction.user.id, durationInSeconds, {
            method: licenseInfo.startsWith('login:') ? 'login' : 'key',
            identifier: licenseInfo,
            username: username
        });

        // Cancelar timer existente se houver
        if (accessTimers.has(interaction.user.id)) {
            clearTimeout(accessTimers.get(interaction.user.id));
            console.log('Timer anterior cancelado para:', interaction.user.tag);
        }

        // Agendar remoção do cargo
        const timeout = setTimeout(async () => {
            try {
                const member = await client.guilds.cache.get(interaction.guild.id).members.fetch(interaction.user.id);
                if (member && member.roles.cache.has(roleId)) {
                    await member.roles.remove(role);
                    console.log(`Acesso expirado e cargo removido para: ${interaction.user.tag}`);
                }
                accessTimers.delete(interaction.user.id);
                database.removeTemporaryAccess(interaction.user.id);
            } catch (error) {
                console.error('Erro ao remover cargo expirado:', error);
            }
        }, durationInSeconds * 1000);

        accessTimers.set(interaction.user.id, timeout);

        // Resposta de sucesso
        const method = licenseInfo.startsWith('login:') ? 'login' : 'chave';
        const expirationDate = new Date(expiresAt);
        
        await interaction.editReply({
            content: `✅ **Acesso liberado com sucesso!**\n\n` +
                    `🔑 **Método:** ${method}\n` +
                    `👤 **Usuário:** ${username}\n` +
                    `⏰ **Válido até:** <t:${Math.floor(expirationDate.getTime() / 1000)}:F>\n` +
                    `📅 **Duração:** 30 dias\n\n` +
                    `Você agora tem acesso ao servidor!`
        });

        console.log(`Acesso liberado para ${interaction.user.tag} por ${method} (${username}) até ${expirationDate}`);
        
    } catch (error) {
        console.error('Erro ao processar aprovação:', error);
        await interaction.editReply({
            content: '❌ Erro ao liberar acesso. Tente novamente.'
        });
    }
}

async function handleLoginSubmission(interaction, client) {
    const accessId = interaction.customId.replace('access_login_', '');
    const username = interaction.fields.getTextInputValue('username').trim();
    const password = interaction.fields.getTextInputValue('password').trim();
    
    // Defer para ter tempo de processar
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        // Verificar se o sistema de acesso existe
        const access = database.getAccess(accessId);
        if (!access) {
            return await interaction.editReply({
                content: '❌ Sistema de acesso não encontrado!'
            });
        }

        // Obter sellerkey
        const sellerKey = 'a685679ae121975b23e948bdd8145cd9'; // KEYAUTH_SELLER_KEY
        if (!sellerKey) {
            console.error('KEYAUTH_SELLER_KEY não encontrada no .env');
            return await interaction.editReply({
                content: '❌ Configuração do servidor incorreta. Contate um administrador.'
            });
        }

        // Verificar dados do usuário usando a API fornecida
        const requestOptions = {
            method: 'GET',
            redirect: 'follow'
        };

        const response = await fetch(`https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=userdata&user=${encodeURIComponent(username)}`, requestOptions);
        const result = await response.text();
        
        let userData;
        try {
            userData = JSON.parse(result);
        } catch (e) {
            return await interaction.editReply({
                content: '❌ Erro ao verificar dados do usuário. Tente novamente.'
            });
        }

        // Verificar se o usuário existe e os dados são válidos
        if (!userData.success) {
            console.log('Falha na verificação do usuário:', userData);
            return await interaction.editReply({
                content: '❌ Usuário não encontrado!'
            });
        }

        console.log('Dados do usuário recebidos:', {
            success: userData.success,
            username: userData.username,
            passwordFromAPI: userData.password,
            passwordProvided: password,
            passwordMatch: userData.password === password,
            banned: userData.banned,
            subscriptions: userData.subscriptions
        });

        // Verificar se a senha está correta usando bcrypt
        const apiPasswordHash = String(userData.password || '').trim();
        const providedPassword = String(password || '').trim();
        
        console.log('Verificação de senha com bcrypt:', {
            hash: apiPasswordHash,
            providedPassword: providedPassword,
            isHashFormat: apiPasswordHash.startsWith('$2a$') || apiPasswordHash.startsWith('$2b$')
        });
        
        let passwordMatch = false;
        
        try {
            if (apiPasswordHash.startsWith('$2a$') || apiPasswordHash.startsWith('$2b$')) {
                // A senha está em formato bcrypt hash
                passwordMatch = await bcrypt.compare(providedPassword, apiPasswordHash);
                console.log('Resultado da verificação bcrypt:', passwordMatch);
            } else {
                // Fallback para comparação direta (senhas em texto plano)
                passwordMatch = apiPasswordHash === providedPassword;
                console.log('Comparação direta:', passwordMatch);
            }
        } catch (bcryptError) {
            console.error('Erro ao verificar senha com bcrypt:', bcryptError);
            passwordMatch = apiPasswordHash === providedPassword; // Fallback
        }
        
        if (!passwordMatch) {
            console.log('Senha incorreta - Hash:', apiPasswordHash, 'Fornecida:', providedPassword);
            return await interaction.editReply({
                content: '❌ Senha incorreta!'
            });
        }

        // Verificar se o usuário está banido
        if (userData.banned && userData.banned !== "false" && userData.banned !== false) {
            return await interaction.editReply({
                content: '❌ Usuário banido! Contate o suporte.'
            });
        }

        // Verificar se o usuário tem assinaturas ativas
        if (!userData.subscriptions || userData.subscriptions.length === 0) {
            return await interaction.editReply({
                content: '❌ Nenhuma assinatura ativa encontrada!'
            });
        }

        // Calcular duração baseada na assinatura
        const subscription = userData.subscriptions[0]; // Pegar primeira assinatura
        let durationInSeconds;
        
        console.log('Dados da assinatura:', subscription);
        
        if (subscription.expiry) {
            const expiryTimestamp = parseInt(subscription.expiry);
            const currentTimestamp = Math.floor(Date.now() / 1000);
            
            // Se a expiração é muito no futuro (maior que 2040), provavelmente é lifetime
            if (expiryTimestamp > 2208988800) { // 01/01/2040
                console.log('Assinatura detectada como LIFETIME');
                durationInSeconds = 31536000 * 10; // 10 anos (praticamente lifetime)
            } else {
                // Calcular duração restante em segundos
                durationInSeconds = Math.max(expiryTimestamp - currentTimestamp, 86400); // Mínimo 1 dia
                console.log(`Duração calculada: ${Math.floor(durationInSeconds / 86400)} dias`);
            }
        } else {
            // Fallback para 30 dias se não tiver expiração
            durationInSeconds = 2592000; // 30 dias
            console.log('Usando duração padrão de 30 dias');
        }

        // Usuário válido - processar aprovação com duração correta
        await processUserApprovalWithDuration(interaction, client, access, userData.username, `login:${username}`, durationInSeconds, {
            subscription: subscription.subscription,
            key: subscription.key,
            expiry: subscription.expiry,
            method: 'login'
        });

    } catch (error) {
        console.error('Erro na verificação por login:', error);
        await interaction.editReply({
            content: '❌ Erro interno. Tente novamente mais tarde.'
        });
    }
}

async function handleLicenseKeySubmission(interaction, client) {
    const accessId = interaction.customId.replace('access_key_', '');
    const licenseKey = interaction.fields.getTextInputValue('license_key').trim();
    
    // Defer para ter tempo de processar
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        // Verificar se o sistema de acesso existe
        const access = database.getAccess(accessId);
        if (!access) {
            return await interaction.editReply({
                content: '❌ Sistema de acesso não encontrado!'
            });
        }

        // Obter sellerkey
        const sellerKey = 'a685679ae121975b23e948bdd8145cd9'; // KEYAUTH_SELLER_KEY
        if (!sellerKey) {
            console.error('KEYAUTH_SELLER_KEY não encontrada no .env');
            return await interaction.editReply({
                content: '❌ Configuração do servidor incorreta. Contate um administrador.'
            });
        }

        // Primeiro verificar se a key existe
        const verifyResponse = await fetch(`https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=verify&key=${licenseKey}`, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const verifyResult = await verifyResponse.text();
        
        // Tentar fazer parse do JSON se não for "success"
        let isValid = false;
        if (verifyResult.trim() === 'success') {
            isValid = true;
        } else {
            try {
                const parsed = JSON.parse(verifyResult);
                isValid = parsed.success === true;
            } catch (e) {
                isValid = false;
            }
        }
        
        if (!isValid) {
            return await interaction.editReply({
                content: '❌ Chave de licença inválida ou não encontrada!'
            });
        }

        // Obter informações da key (duração)
        const infoResponse = await fetch(`https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=info&key=${licenseKey}`, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const infoResult = await infoResponse.text();
        let keyInfo;
        
        try {
            keyInfo = JSON.parse(infoResult);
        } catch (parseError) {
            console.error('Erro ao fazer parse do resultado da API:', parseError);
            return await interaction.editReply({
                content: '❌ Erro ao verificar informações da licença.'
            });
        }

        if (!keyInfo.success) {
            return await interaction.editReply({
                content: '❌ Não foi possível obter informações da licença.'
            });
        }

        console.log('KeyInfo recebida:', keyInfo);
        
        // Converter duração para segundos
        let durationInSeconds;
        const duration = keyInfo.duration;
        
        console.log('Duração original da API:', duration, 'tipo:', typeof duration);
        
        // Verificar se a duração é uma string que representa dias
        if (typeof duration === 'string') {
            if (duration.includes('day') || duration.includes('dias')) {
                // Extrair número dos dias
                const days = parseInt(duration.match(/\d+/)[0]);
                durationInSeconds = days * 86400; // Converter dias para segundos
            } else if (duration.includes('hour') || duration.includes('horas')) {
                // Extrair número das horas
                const hours = parseInt(duration.match(/\d+/)[0]);
                durationInSeconds = hours * 3600; // Converter horas para segundos
            } else {
                // Tentar converter diretamente
                const parsed = parseInt(duration);
                if (parsed < 86400) {
                    durationInSeconds = parsed * 86400; // Assumir que está em dias
                } else {
                    durationInSeconds = parsed; // Assumir que já está em segundos
                }
            }
        } else {
            // Se for número, verificar o valor
            const parsed = parseInt(duration);
            if (parsed < 86400) {
                durationInSeconds = parsed * 86400; // Converter dias para segundos
            } else {
                durationInSeconds = parsed; // Já está em segundos
            }
        }
        
        console.log('Duração convertida para segundos:', durationInSeconds);
        console.log('Isso equivale a:', Math.floor(durationInSeconds / 86400), 'dias');
        
        // Validar se a duração é razoável (mínimo 1 minuto, máximo 1 ano)
        if (durationInSeconds < 60) {
            console.error('Duração muito baixa, definindo para 1 dia:', durationInSeconds);
            durationInSeconds = 86400; // 1 dia como fallback
        } else if (durationInSeconds > 31536000) {
            console.error('Duração muito alta, limitando a 1 ano:', durationInSeconds);
            durationInSeconds = 31536000; // 1 ano máximo
        }

        // Processar aprovação usando a nova função
        await processUserApprovalWithDuration(interaction, client, access, licenseKey, `key:${licenseKey}`, durationInSeconds, {
            key: licenseKey,
            duration: keyInfo.duration,
            note: keyInfo.note,
            level: keyInfo.level,
            createdby: keyInfo.createdby
        });

    } catch (error) {
        console.error('Erro ao processar licença:', error);
        await interaction.editReply({
            content: '❌ Erro interno ao processar a licença. Tente novamente ou contate um administrador.'
        });
    }
}

// Função para verificação de acesso com licença
async function handleAccessVerificationKey(interaction, client) {
    const accessId = interaction.customId.replace('access_verify_key_', '');
    
    try {
        // Verificar se o sistema de acesso existe
        const access = database.getAccess(accessId);
        if (!access) {
            return await interaction.reply({
                content: '❌ Sistema de acesso não encontrado!',
                flags: MessageFlags.Ephemeral
            });
        }

        // Verificar se usuário já tem acesso temporário válido
        if (database.hasValidTemporaryAccess(interaction.user.id)) {
            return await interaction.reply({
                content: '✅ Você já possui acesso ativo ao servidor!',
                flags: MessageFlags.Ephemeral
            });
        }

        // Criar modal para inserção da licença
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: ModalActionRowBuilder } = require('discord.js');
        
        const modal = new ModalBuilder()
            .setCustomId(`access_key_${accessId}`)
            .setTitle('🔑 Liberar por Key');

        const keyInput = new TextInputBuilder()
            .setCustomId('license_key')
            .setLabel('Digite sua chave de licença:')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('XXXX-XXXX-XXXX-XXXX')
            .setRequired(true)
            .setMaxLength(100);

        const row = new ModalActionRowBuilder().addComponents(keyInput);
        modal.addComponents(row);

        await interaction.showModal(modal);

    } catch (error) {
        console.error('Erro na verificação de acesso por chave:', error);
        await interaction.reply({
            content: '❌ Erro interno. Tente novamente.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleAccessVerificationLogin(interaction, client) {
    const accessId = interaction.customId.replace('access_verify_login_', '');
    
    try {
        // Verificar se o sistema de acesso existe
        const access = database.getAccess(accessId);
        if (!access) {
            return await interaction.reply({
                content: '❌ Sistema de acesso não encontrado!',
                flags: MessageFlags.Ephemeral
            });
        }

        // Verificar se usuário já tem acesso temporário válido
        if (database.hasValidTemporaryAccess(interaction.user.id)) {
            return await interaction.reply({
                content: '✅ Você já possui acesso ativo ao servidor!',
                flags: MessageFlags.Ephemeral
            });
        }

        // Criar modal para inserção do usuário e senha
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: ModalActionRowBuilder } = require('discord.js');
        
        const modal = new ModalBuilder()
            .setCustomId(`access_login_${accessId}`)
            .setTitle('👤 Liberar por Login');

        const usernameInput = new TextInputBuilder()
            .setCustomId('username')
            .setLabel('Digite seu usuário:')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('seu_usuario')
            .setRequired(true)
            .setMaxLength(50);

        const passwordInput = new TextInputBuilder()
            .setCustomId('password')
            .setLabel('Digite sua senha:')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('sua_senha')
            .setRequired(true)
            .setMaxLength(100);

        const row1 = new ModalActionRowBuilder().addComponents(usernameInput);
        const row2 = new ModalActionRowBuilder().addComponents(passwordInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);

    } catch (error) {
        console.error('Erro na verificação de acesso por login:', error);
        await interaction.reply({
            content: '❌ Erro interno. Tente novamente.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleAccessVerification(interaction, client) {
    const accessId = interaction.customId.replace('access_verify_', '');
    
    try {
        // Verificar se o sistema de acesso existe
        const access = database.getAccess(accessId);
        if (!access) {
            return await interaction.reply({
                content: '❌ Sistema de acesso não encontrado!',
                flags: MessageFlags.Ephemeral
            });
        }

        // Verificar se usuário já tem acesso temporário válido
        if (database.hasValidTemporaryAccess(interaction.user.id)) {
            return await interaction.reply({
                content: '✅ Você já possui acesso ativo ao servidor!',
                flags: MessageFlags.Ephemeral
            });
        }

        // Criar modal para inserção da licença
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: ModalActionRowBuilder } = require('discord.js');
        
        const modal = new ModalBuilder()
            .setCustomId(`access_key_${accessId}`)
            .setTitle('🔑 Verificação de Licença');

        const keyInput = new TextInputBuilder()
            .setCustomId('license_key')
            .setLabel('Digite sua chave de licença:')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('XXXX-XXXX-XXXX-XXXX')
            .setRequired(true)
            .setMaxLength(100);

        const row = new ModalActionRowBuilder().addComponents(keyInput);
        modal.addComponents(row);

        await interaction.showModal(modal);

    } catch (error) {
        console.error('Erro na verificação de acesso:', error);
        await interaction.reply({
            content: '❌ Erro interno. Tente novamente.',
            flags: MessageFlags.Ephemeral
        });
    }
}

// Função para aprovar usuário
async function handleRejectUser(interaction, client, userId) {
    // Verificar se a interação já foi respondida
    if (interaction.replied || interaction.deferred) {
        return;
    }
    
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const pendingApproval = database.getPendingApproval(userId);
        
        if (!pendingApproval) {
            return interaction.editReply({
                content: '❌ Aprovação não encontrada ou já processada.'
            });
        }

        const user = await client.users.fetch(userId).catch(() => null);
        
        // Remover da lista de aprovações pendentes
        database.removePendingApproval(userId);

        // Atualizar o embed original
        const rejectedEmbed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('❌ Usuário Rejeitado')
            .setDescription(`**${user?.tag || 'Usuário'}** foi rejeitado.`)
            .addFields(
                { name: 'Chave', value: `\`${pendingApproval.licenseKey}\``, inline: true },
                { name: 'Rejeitado por', value: `${interaction.user.tag}`, inline: true }
            )
            .setTimestamp();

        await interaction.message.edit({ 
            embeds: [rejectedEmbed], 
            components: [] 
        });

        await interaction.editReply({
            content: `✅ Usuário rejeitado.`
        });

    } catch (error) {
        console.error('Erro ao rejeitar usuário:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Erro ao rejeitar usuário.',
                flags: MessageFlags.Ephemeral
            });
        } else {
            await interaction.editReply({
                content: '❌ Erro ao rejeitar usuário.'
            }).catch(() => {});
        }
    }
}

// Função para remover verificação
async function handleRemoveVerification(interaction, client, userId) {
    // Verificar se a interação já foi respondida
    if (interaction.replied || interaction.deferred) {
        return;
    }
    
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) {
            return interaction.editReply({
                content: '❌ Usuário não encontrado.'
            });
        }

        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!member) {
            return interaction.editReply({
                content: '❌ Usuário não está no servidor.'
            });
        }

        // Remover role de verificado
        const verifiedRoleId = client.settings.verifiedRoleId;
        if (verifiedRoleId && member.roles.cache.has(verifiedRoleId)) {
            await member.roles.remove(verifiedRoleId);
        }

        // Remover do database
        const userData = database.getUser(userId);
        database.removeUser(userId);
        
        // Adicionar aos usuários removidos
        database.addRemovedUser(userId, userData?.licenseKey || 'unknown');

        // Log
        const logger = new Logger(client);
        await logger.logUnverification(user, interaction.user);

        await interaction.editReply({
            content: `✅ Verificação de ${user.tag} foi removida.`
        });

    } catch (error) {
        console.error('Erro ao remover verificação:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Erro ao remover verificação.',
                flags: MessageFlags.Ephemeral
            });
        } else {
            await interaction.editReply({
                content: '❌ Erro ao remover verificação.'
            }).catch(() => {});
        }
    }
}

// Função para lidar com select menus de painéis (criação de tickets)
async function handlePanelSelectMenu(interaction, client) {
    if (interaction.replied || interaction.deferred) {
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const panelId = interaction.customId.replace('_select', '');
        const selectedValue = interaction.values[0];
        const user = interaction.user;
        const guild = interaction.guild;

        // Buscar painel no database
        const panel = database.getPanel(panelId);
        if (!panel) {
            return interaction.editReply({
                content: '❌ Painel não encontrado.'
            });
        }

        // Encontrar a opção selecionada
        const selectedOption = panel.selectOptions?.find(opt => opt.value === selectedValue);
        if (!selectedOption) {
            return interaction.editReply({
                content: '❌ Opção selecionada não encontrada.'
            });
        }

        // Verificar se já tem ticket aberto
        const existingTicket = database.getUserTicket(user.id);
        if (existingTicket) {
            const ticketChannel = await guild.channels.fetch(existingTicket.channelId).catch(() => null);
            if (ticketChannel) {
                return interaction.editReply({
                    content: `❌ Você já tem um ticket aberto: ${ticketChannel}`
                });
            } else {
                // Canal não existe mais, remover do database
                database.closeTicket(existingTicket.channelId);
            }
        }

        // Obter categoria de tickets
        const ticketsCategoryId = process.env.TICKETS_CATEGORY_ID || client.settings.ticketsCategoryId;
        if (!ticketsCategoryId) {
            return interaction.editReply({
                content: '❌ Categoria de tickets não configurada.'
            });
        }

        const ticketsCategory = await guild.channels.fetch(ticketsCategoryId).catch(() => null);
        if (!ticketsCategory) {
            return interaction.editReply({
                content: '❌ Categoria de tickets não encontrada.'
            });
        }

        // Criar canal do ticket
        const ticketChannel = await guild.channels.create({
            name: `🎫・${user.username}`,
            type: ChannelType.GuildText,
            parent: ticketsCategoryId,
            permissionOverwrites: [
                {
                    id: guild.id, // @everyone
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id, // Usuário que abriu
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },
                {
                    id: client.user.id, // Bot
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageChannels
                    ]
                }
                // Adicionar permissões para roles de staff se configurado
            ]
        });

        // Adicionar permissões para admins e roles de suporte
        const adminRoleId = process.env.ADMIN_ROLE_ID;
        if (adminRoleId) {
            await ticketChannel.permissionOverwrites.create(adminRoleId, {
                ViewChannel: true,
                SendMessages: true,
                ManageChannels: true
            });
        }

        // Criar embed do ticket (baseada na imagem)
        const ticketEmbed = new EmbedBuilder()
            .setColor('#00ffff') // Cor ciano como na imagem
            .setTitle('Scarlet ® | Atendimento')
            .setDescription([
                `• **Olá ${user} Seja Bem-Vindo(A), Como podemos te ajudar?**`,
                '',
                `• **Usuário:** ${user}`,
                '',
                `• **Horário:** ${new Date().toLocaleDateString('pt-BR')} | ${new Date().toLocaleTimeString('pt-BR')}`,
                '',
                `• **Motivo:** ${selectedOption.label}`,
                '',
                `• **Staff que assumiu:** Ticket não assumido.`
            ].join('\n'))
            .setFooter({ 
                text: `Bom ${user}, Peço que aguarde pacientemente a nossa equipe vir lhe atender. Eles já foram acionados.` 
            });

        // Criar botões do ticket
        const ticketButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('leave_ticket')
                    .setLabel('👈 Sair do Ticket')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_member')
                    .setLabel('👤 Painel Membro')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('ticket_staff')
                    .setLabel('🛠️ Painel Staff')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('assume_ticket')
                    .setLabel('☑️ Assumir Ticket')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('❌ Fechar Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

        // Enviar embed no canal do ticket
        await ticketChannel.send({
            embeds: [ticketEmbed],
            components: [ticketButtons]
        });

        // Salvar ticket no database
        database.createTicket(ticketChannel.id, user.id, selectedOption.label);

        // Log da criação do ticket
        const logger = new Logger(client);
        await logger.logTicketCreation(user, ticketChannel, selectedOption.label);

        // Responder ao usuário
        await interaction.editReply({
            content: `✅ Ticket criado com sucesso! ${ticketChannel}`
        });

    } catch (error) {
        console.error('Erro ao criar ticket:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Erro ao criar ticket.',
                flags: MessageFlags.Ephemeral
            });
        } else {
            await interaction.editReply({
                content: '❌ Erro ao criar ticket.'
            }).catch(() => {});
        }
    }
}

// Função para sair do ticket
async function handleLeaveTicket(interaction, client) {
    const ticket = database.getTicket(interaction.channel.id);
    
    if (!ticket) {
        return interaction.reply({
            content: '❌ Este não é um canal de ticket válido.',
            flags: MessageFlags.Ephemeral
        });
    }

    // Verificar se é o dono do ticket
    if (ticket.userId !== interaction.user.id) {
        return interaction.reply({
            content: '❌ Apenas o dono do ticket pode sair dele.',
            flags: MessageFlags.Ephemeral
        });
    }

    try {
        // Remover permissões do usuário
        await interaction.channel.permissionOverwrites.delete(interaction.user.id);

        await interaction.reply({
            content: `👈 ${interaction.user} saiu do ticket.`,
            ephemeral: false
        });

    } catch (error) {
        console.error('Erro ao sair do ticket:', error);
        await interaction.reply({
            content: '❌ Erro ao sair do ticket.',
            flags: MessageFlags.Ephemeral
        });
    }
}

// Função para assumir ticket
async function handleAssumeTicket(interaction, client) {
    const ticket = database.getTicket(interaction.channel.id);
    
    if (!ticket) {
        return interaction.reply({
            content: '❌ Este não é um canal de ticket válido.',
            flags: MessageFlags.Ephemeral
        });
    }

    // Verificar se é staff (admin)
    if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({
            content: '❌ Apenas staff pode assumir tickets.',
            flags: MessageFlags.Ephemeral
        });
    }

    // Verificar se o ticket já foi assumido
    if (ticket.assignedTo) {
        return interaction.reply({
            content: '❌ Este ticket já foi assumido por outro membro da equipe.',
            flags: MessageFlags.Ephemeral
        });
    }

    try {
        // Atualizar ticket no database
        database.updateTicket(interaction.channel.id, {
            assignedTo: interaction.user.id,
            assignedAt: new Date().toISOString()
        });

        // Buscar o usuário do ticket
        const ticketOwner = await client.users.fetch(ticket.userId).catch(() => null);

        // Atualizar embed do ticket
        const ticketEmbed = new EmbedBuilder()
            .setColor('#00ffff')
            .setTitle('Scarlet ® | Atendimento')
            .setDescription([
                `• **Olá ${ticketOwner} Seja Bem-Vindo(A), Como podemos te ajudar?**`,
                '',
                `• **Usuário:** ${ticketOwner}`,
                '',
                `• **Horário:** ${new Date(ticket.createdAt).toLocaleDateString('pt-BR')} | ${new Date(ticket.createdAt).toLocaleTimeString('pt-BR')}`,
                '',
                `• **Motivo:** ${ticket.reason}`,
                '',
                `• **Staff que assumiu:** ${interaction.user} ✅`
            ].join('\n'))
            .setFooter({ 
                text: `Ticket assumido por ${interaction.user.tag} em ${new Date().toLocaleString('pt-BR')}` 
            });

        // Encontrar a mensagem original do ticket e atualizar
        const messages = await interaction.channel.messages.fetch({ limit: 10 });
        const ticketMessage = messages.find(msg => 
            msg.author.id === client.user.id && 
            msg.embeds.length > 0 && 
            msg.embeds[0].title === 'Scarlet ® | Atendimento'
        );

        if (ticketMessage) {
            await ticketMessage.edit({ embeds: [ticketEmbed], components: ticketMessage.components });
        }

        await interaction.reply({
            content: `☑️ Ticket assumido por ${interaction.user}!`,
            ephemeral: false
        });

    } catch (error) {
        console.error('Erro ao assumir ticket:', error);
        await interaction.reply({
            content: '❌ Erro ao assumir ticket.',
            flags: MessageFlags.Ephemeral
        });
    }
}

// Função para iniciar reset HWID
async function handleHwidReset(interaction, client) {
    const hwidId = interaction.customId.replace('hwid_reset_', '');
    
    try {
        // Verificar se o sistema de HWID existe
        const hwid = database.getHwid(hwidId);
        if (!hwid) {
            return await interaction.reply({
                content: '❌ Sistema de HWID não encontrado!',
                flags: MessageFlags.Ephemeral
            });
        }

        // Criar canal para o processo
        const categoryId = '1431657272492298484'; // TICKETS_CATEGORY_ID
        const category = interaction.guild.channels.cache.get(categoryId);
        
        if (!category) {
            return await interaction.reply({
                content: '❌ Categoria de tickets não encontrada!',
                flags: MessageFlags.Ephemeral
            });
        }

        // Verificar se usuário já tem um canal de HWID ativo
        const existingChannel = interaction.guild.channels.cache.find(channel => 
            channel.name === `⛔・${interaction.user.username}` && 
            channel.parentId === categoryId
        );

        if (existingChannel) {
            return await interaction.reply({
                content: `❌ Você já tem um processo de HWID ativo em ${existingChannel}!`,
                flags: MessageFlags.Ephemeral
            });
        }

        const hwidChannel = await interaction.guild.channels.create({
            name: `⛔・${interaction.user.username}`,
            type: 0, // GUILD_TEXT
            parent: categoryId,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: ['ViewChannel']
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
                },
                {
                    id: '1366229765517742152', // ADMIN_ROLE_ID
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages']
                }
            ]
        });

        // Criar processo no database
        database.createHwidProcess(hwidChannel.id, interaction.user.id, hwidId);

        // Criar embed inicial
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Scarlet ® - HWID System')
            .setDescription('**Passo 1/3**\n\nQual seu usuário do menu?')
            .setColor('#ff6b6b')
            .setFooter({ text: 'Digite sua resposta na mensagem abaixo' })
            .setTimestamp();

        await hwidChannel.send({
            content: `${interaction.user}`,
            embeds: [embed]
        });

        await interaction.reply({
            content: `✅ Canal de reset HWID criado: ${hwidChannel}`,
            flags: MessageFlags.Ephemeral
        });

        console.log(`📋 Processo HWID iniciado para ${interaction.user.tag} no canal ${hwidChannel.name}`);

    } catch (error) {
        console.error('Erro ao iniciar reset HWID:', error);
        await interaction.reply({
            content: '❌ Erro interno. Tente novamente.',
            flags: MessageFlags.Ephemeral
        });
    }
}

// Função para lidar com aprovação/recusa de HWID
async function handleHwidApproval(interaction, client) {
    // Verificar se é admin
    const adminRoleId = '1366229765517742152';
    if (!interaction.member.roles.cache.has(adminRoleId)) {
        return await interaction.reply({
            content: '❌ Apenas administradores podem usar estes botões.',
            flags: MessageFlags.Ephemeral
        });
    }

    const isApproval = interaction.customId.startsWith('hwid_approve_');
    const channelId = interaction.customId.split('_')[2];
    
    try {
        const process = database.getHwidProcess(channelId);
        if (!process) {
            return await interaction.reply({
                content: '❌ Processo não encontrado!',
                flags: MessageFlags.Ephemeral
            });
        }

        if (isApproval) {
            // Aprovar - fazer reset via API
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            
            const sellerKey = 'a685679ae121975b23e948bdd8145cd9'; // KEYAUTH_SELLER_KEY
            const username = process.username;
            
            try {
                const response = await fetch(`https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=resetuser&user=${username}`, {
                    method: 'GET',
                    redirect: 'follow'
                });
                
                const result = await response.text();
                console.log('Reset HWID result:', result);
                
                // Notificar usuário
                const user = await client.users.fetch(process.userId);
                try {
                    await user.send('✅ Seu HWID foi resetado com sucesso! Você já pode usar o menu novamente.');
                } catch (dmError) {
                    console.log('Não foi possível enviar DM para:', user.tag);
                }
                
                await interaction.editReply({
                    content: `✅ HWID resetado com sucesso para ${username}!`
                });
                
            } catch (apiError) {
                console.error('Erro na API de reset:', apiError);
                await interaction.editReply({
                    content: '❌ Erro ao comunicar com a API. Tente novamente.'
                });
                return;
            }
            
        } else {
            // Recusar - pedir motivo
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: ModalActionRowBuilder } = require('discord.js');
            
            const modal = new ModalBuilder()
                .setCustomId(`hwid_reject_reason_${channelId}`)
                .setTitle('Motivo da Recusa');

            const reasonInput = new TextInputBuilder()
                .setCustomId('reject_reason')
                .setLabel('Por que está recusando?')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Digite o motivo da recusa...')
                .setRequired(true)
                .setMaxLength(500);

            const row = new ModalActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return;
        }

        // Limpar dados e deletar canal
        database.deleteHwidProcess(channelId);
        
        setTimeout(async () => {
            try {
                const channel = await client.channels.fetch(channelId);
                if (channel) {
                    await channel.delete();
                    console.log(`🗑️ Canal de HWID deletado: ${channel.name}`);
                }
            } catch (error) {
                console.error('Erro ao deletar canal:', error);
            }
        }, 5000); // 5 segundos para ler a mensagem

    } catch (error) {
        console.error('Erro no processo de aprovação HWID:', error);
        await interaction.reply({
            content: '❌ Erro interno. Tente novamente.',
            flags: MessageFlags.Ephemeral
        });
    }
}

// Função para lidar com motivo de recusa HWID
async function handleHwidRejectReason(interaction, client) {
    const channelId = interaction.customId.replace('hwid_reject_reason_', '');
    const reason = interaction.fields.getTextInputValue('reject_reason');
    
    try {
        const process = database.getHwidProcess(channelId);
        if (!process) {
            return await interaction.reply({
                content: '❌ Processo não encontrado!',
                flags: MessageFlags.Ephemeral
            });
        }

        // Notificar usuário sobre a recusa
        const user = await client.users.fetch(process.userId);
        try {
            await user.send(`❌ **Solicitação de Reset HWID Recusada**\n\n**Motivo:** ${reason}\n\nVocê pode tentar novamente mais tarde ou entrar em contato com a administração.`);
        } catch (dmError) {
            console.log('Não foi possível enviar DM para:', user.tag);
        }

        await interaction.reply({
            content: `✅ Processo recusado. Usuário foi notificado via DM.`,
            flags: MessageFlags.Ephemeral
        });

        // Limpar dados e deletar canal
        database.deleteHwidProcess(channelId);
        
        setTimeout(async () => {
            try {
                const channel = await client.channels.fetch(channelId);
                if (channel) {
                    await channel.delete();
                    console.log(`🗑️ Canal de HWID deletado após recusa: ${channel.name}`);
                }
            } catch (error) {
                console.error('Erro ao deletar canal:', error);
            }
        }, 3000);

    } catch (error) {
        console.error('Erro ao processar recusa HWID:', error);
        await interaction.reply({
            content: '❌ Erro interno.',
            flags: MessageFlags.Ephemeral
        });
    }
}

// ========== HANDLERS DE DOWNLOAD ==========

/**
 * Handler para botões de download de menu
 */
async function handleDownloadMenu(interaction, client) {
    try {
        const channelId = interaction.customId.replace('download_menu_', '');
        const guildId = interaction.guild.id;
        
        // Obter configuração de download
        const config = database.getDownloadConfig(guildId, channelId);
        
        if (!config) {
            return await interaction.reply({
                content: '❌ Configuração de download não encontrada.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        if (!config.fileUrl) {
            return await interaction.reply({
                content: '❌ Arquivo não configurado. Entre em contato com um administrador.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Responder com o link direto
        await interaction.reply({
            content: config.fileUrl,
            flags: MessageFlags.Ephemeral
        });
        
        console.log(`📥 ${interaction.user.tag} baixou: ${config.fileName}`);
        
    } catch (error) {
        console.error('Erro no download de menu:', error);
        await interaction.reply({
            content: '❌ Erro ao processar o download.',
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * Handler para modal de configuração de download
 */
async function handleDownloadConfigModal(interaction, client) {
    try {
        const channelId = interaction.customId.replace('config_download_', '');
        const guildId = interaction.guild.id;
        
        // Obter dados do modal
        const title = interaction.fields.getTextInputValue('download_title');
        const description = interaction.fields.getTextInputValue('download_description');
        const color = interaction.fields.getTextInputValue('download_color');
        const buttonText = interaction.fields.getTextInputValue('download_button_text');
        const fileUrl = interaction.fields.getTextInputValue('download_file_url');
        
        // Validar cor hex
        const hexRegex = /^#[0-9A-F]{6}$/i;
        if (!hexRegex.test(color)) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('❌ Cor inválida')
                    .setDescription('A cor deve estar no formato hex (ex: #00ff00)')
                    .setColor('#ff0000')
                ],
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Determinar nome do arquivo da URL se fornecida
        let fileName = 'menu.rar';
        if (fileUrl) {
            try {
                const urlParts = fileUrl.split('/');
                const lastPart = urlParts[urlParts.length - 1];
                if (lastPart.includes('.')) {
                    fileName = lastPart;
                }
            } catch (e) {
                // Manter nome padrão se houver erro
            }
        }
        
        // Atualizar configuração
        const config = {
            title,
            description,
            color,
            fileName,
            fileUrl: fileUrl || null,
            buttonText
        };
        
        database.setDownloadConfig(guildId, channelId, config);
        
        // Buscar mensagem do painel para atualizar
        const channel = await client.channels.fetch(channelId);
        if (channel) {
            // Buscar mensagens recentes que contenham embeds de download
            const messages = await channel.messages.fetch({ limit: 50 });
            
            for (const message of messages.values()) {
                if (message.author.id === client.user.id && 
                    message.embeds.length > 0 && 
                    message.components.length > 0) {
                    
                    const embed = message.embeds[0];
                    if (embed.title && (embed.title.includes('Download') || embed.title.includes('📥'))) {
                        // Atualizar embed
                        const updatedEmbed = new EmbedBuilder()
                            .setTitle(config.title)
                            .setDescription(config.description)
                            .setColor(config.color)
                            .setTimestamp();
                        
                        // Atualizar botão
                        const updatedButton = new ButtonBuilder()
                            .setCustomId(`download_menu_${channelId}`)
                            .setLabel(config.buttonText)
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(!config.fileUrl);
                        
                        const row = new ActionRowBuilder().addComponents(updatedButton);
                        
                        await message.edit({
                            embeds: [updatedEmbed],
                            components: [row]
                        });
                        
                        break;
                    }
                }
            }
        }
        
        // Resposta de confirmação
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('✅ Configuração atualizada!')
                .setDescription(`Painel de download atualizado com sucesso`)
                .addFields(
                    { name: '📋 Configurações', value: `**Título:** ${config.title}\n**Arquivo:** ${config.fileName}\n**Status:** ${config.fileUrl ? '🟢 Configurado' : '🔴 Não configurado'}`, inline: false }
                )
                .setColor('#00ff00')
            ],
            flags: MessageFlags.Ephemeral
        });
        
    } catch (error) {
        console.error('Erro no modal de configuração:', error);
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('❌ Erro')
                .setDescription('Ocorreu um erro ao salvar as configurações.')
                .setColor('#ff0000')
            ],
            flags: MessageFlags.Ephemeral
        });
    }
}

// ========== HANDLERS DO SISTEMA DE FIX ==========

/**
 * Handler principal para interações do sistema de fix
 */
async function handleFixInteraction(interaction, client) {
    try {
        const customId = interaction.customId;
        
        // Configuração básica (título, descrição, cor)
        if (customId.startsWith('fix_edit_')) {
            await handleFixEdit(interaction, client);
        }
        // Gerenciar categorias
        else if (customId.startsWith('fix_manage_categories_')) {
            await handleFixCategoryManagement(interaction, client);
        }
        // Visualizar painel
        else if (customId.startsWith('fix_preview_')) {
            await handleFixPreview(interaction, client);
        }
        // Atualizar painel
        else if (customId.startsWith('fix_update_panel_')) {
            await handleFixPanelUpdate(interaction, client);
        }
        // Categoria clicada (mostrar subcategorias)
        else if (customId.startsWith('fix_category_')) {
            await handleFixCategoryClick(interaction, client);
        }
        // Subcategoria clicada (resposta final)
        else if (customId.startsWith('fix_subcategory_')) {
            await handleFixSubcategoryClick(interaction, client);
        }
        // Adicionar categoria
        else if (customId.startsWith('fix_add_category_')) {
            await handleFixAddCategory(interaction, client);
        }
        // Listar/editar categorias
        else if (customId.startsWith('fix_list_categories_')) {
            await handleFixListCategories(interaction, client);
        }
        // Deletar categoria
        else if (customId.startsWith('fix_delete_category_')) {
            await handleFixDeleteCategory(interaction, client);
        }
        // Editar categoria específica
        else if (customId.startsWith('fix_edit_cat_')) {
            await handleFixEditCategory(interaction, client);
        }
        // Gerenciar subcategorias
        else if (customId.startsWith('fix_manage_subs_')) {
            await handleFixManageSubcategories(interaction, client);
        }
        // Adicionar subcategoria
        else if (customId.startsWith('fix_add_sub_')) {
            await handleFixAddSubcategory(interaction, client);
        }
        // Confirmar exclusão de categoria
        else if (customId.startsWith('fix_confirm_delete_')) {
            const channelId = customId.split('_')[3];
            const categoryIndex = parseInt(customId.split('_')[4]);
            
            const panel = database.getFixPanel(interaction.guild.id, channelId);
            if (!panel || !panel.categories || categoryIndex >= panel.categories.length || categoryIndex < 0) {
                return await interaction.reply({
                    content: '❌ Categoria não encontrada.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const categoryName = panel.categories[categoryIndex].name;
            
            // Remover categoria
            panel.categories.splice(categoryIndex, 1);
            database.setFixPanel(interaction.guild.id, channelId, panel);
            
            await interaction.reply({
                content: `✅ Categoria **${categoryName}** deletada com sucesso!`,
                flags: MessageFlags.Ephemeral
            });
        }
        // Cancelar exclusão
        else if (customId.startsWith('fix_cancel_delete_')) {
            await interaction.reply({
                content: '❌ Exclusão cancelada.',
                flags: MessageFlags.Ephemeral
            });
        }
        // Voltar para categorias
        else if (customId.startsWith('fix_back_categories_')) {
            const channelId = customId.split('_')[3];
            await handleFixCategoryManagement(interaction, client);
        }
        // Listar subcategorias para edição
        else if (customId.startsWith('fix_list_subs_')) {
            const channelId = customId.split('_')[3];
            const categoryIndex = parseInt(customId.split('_')[4]);
            
            const panel = database.getFixPanel(channelId);
            if (!panel || !panel.categories || categoryIndex >= panel.categories.length || categoryIndex < 0) {
                return await interaction.reply({
                    content: '❌ Categoria não encontrada.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const category = panel.categories[categoryIndex];
            
            const embed = new EmbedBuilder()
                .setTitle(`🛠️ Editar Subcategorias - ${category.name}`)
                .setColor(category.color || '#00ff00');
            
            if (!category.subcategories || category.subcategories.length === 0) {
                embed.setDescription('**Nenhuma subcategoria encontrada.**');
                
                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            
            let description = '**Selecione uma subcategoria para editar:**\n\n';
            category.subcategories.forEach((sub, index) => {
                description += `**${index + 1}.** ${sub.emoji} ${sub.name}\n`;
            });
            embed.setDescription(description);
            
            // Criar botões das subcategorias (máximo 25)
            const components = [];
            for (let i = 0; i < category.subcategories.length && i < 25; i += 5) {
                const row = new ActionRowBuilder();
                const subcategorySlice = category.subcategories.slice(i, i + 5);
                
                subcategorySlice.forEach((sub, subIndex) => {
                    const actualIndex = i + subIndex;
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`fix_edit_sub_${channelId}_${categoryIndex}_${actualIndex}`)
                            .setLabel(`${sub.emoji} ${sub.name.substring(0, 20)}`)
                            .setStyle(ButtonStyle.Secondary)
                    );
                });
                components.push(row);
            }
            
            // Botão de voltar
            const backRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`fix_manage_subs_${channelId}_${categoryIndex}`)
                        .setLabel('🔙 Voltar')
                        .setStyle(ButtonStyle.Secondary)
                );
            components.push(backRow);
            
            await interaction.reply({
                embeds: [embed],
                components: components,
                flags: MessageFlags.Ephemeral
            });
        }
        // Editar subcategoria específica
        else if (customId.startsWith('fix_edit_sub_')) {
            const channelId = customId.split('_')[3];
            const categoryIndex = parseInt(customId.split('_')[4]);
            const subcategoryIndex = parseInt(customId.split('_')[5]);
            
            const panel = database.getFixPanel(channelId);
            if (!panel || !panel.categories || categoryIndex >= panel.categories.length || categoryIndex < 0) {
                return await interaction.reply({
                    content: '❌ Categoria não encontrada.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const category = panel.categories[categoryIndex];
            if (!category.subcategories || subcategoryIndex >= category.subcategories.length || subcategoryIndex < 0) {
                return await interaction.reply({
                    content: '❌ Subcategoria não encontrada.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const subcategory = category.subcategories[subcategoryIndex];
            
            const modal = new ModalBuilder()
                .setCustomId(`fix_modal_edit_subcategory_${channelId}_${categoryIndex}_${subcategoryIndex}`)
                .setTitle('Editar Subcategoria');

            const nameInput = new TextInputBuilder()
                .setCustomId('subcategory_name')
                .setLabel('Nome da Subcategoria')
                .setStyle(TextInputStyle.Short)
                .setValue(subcategory.name)
                .setRequired(true)
                .setMaxLength(80);

            const descriptionInput = new TextInputBuilder()
                .setCustomId('subcategory_description')
                .setLabel('Descrição da Subcategoria')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(subcategory.description)
                .setRequired(true)
                .setMaxLength(300);

            const emojiInput = new TextInputBuilder()
                .setCustomId('subcategory_emoji')
                .setLabel('Emoji da Subcategoria')
                .setStyle(TextInputStyle.Short)
                .setValue(subcategory.emoji)
                .setRequired(true)
                .setMaxLength(10);

            const colorInput = new TextInputBuilder()
                .setCustomId('subcategory_color')
                .setLabel('Cor da Subcategoria (hex)')
                .setStyle(TextInputStyle.Short)
                .setValue(subcategory.color)
                .setRequired(true)
                .setMaxLength(7);

            const responseInput = new TextInputBuilder()
                .setCustomId('subcategory_response')
                .setLabel('Resposta da Subcategoria')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(subcategory.response)
                .setRequired(true)
                .setMaxLength(1000);

            const row1 = new ActionRowBuilder().addComponents(nameInput);
            const row2 = new ActionRowBuilder().addComponents(descriptionInput);
            const row3 = new ActionRowBuilder().addComponents(emojiInput);
            const row4 = new ActionRowBuilder().addComponents(colorInput);
            const row5 = new ActionRowBuilder().addComponents(responseInput);

            modal.addComponents(row1, row2, row3, row4, row5);
            await interaction.showModal(modal);
        }
        // Voltar ao menu principal
        else if (customId.startsWith('fix_back_main_')) {
            const channelId = customId.split('_')[3];
            
            const panel = database.getFixPanel(channelId);
            if (!panel) {
                return await interaction.reply({
                    content: '❌ Painel não encontrado.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Criar embed principal
            const mainEmbed = new EmbedBuilder()
                .setTitle(panel.title)
                .setDescription(panel.description)
                .setColor(panel.color)
                .setTimestamp();
            
            // Criar botões das categorias
            const components = [];
            
            if (panel.categories && panel.categories.length > 0) {
                for (let i = 0; i < panel.categories.length; i += 5) {
                    const row = new ActionRowBuilder();
                    const categorySlice = panel.categories.slice(i, i + 5);
                    
                    categorySlice.forEach((category, index) => {
                        const actualIndex = i + index;
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`fix_category_${channelId}_${actualIndex}`)
                                .setLabel(`${category.emoji} ${category.name}`)
                                .setStyle(ButtonStyle.Secondary)
                        );
                    });
                    components.push(row);
                }
            } else {
                mainEmbed.setDescription(`${panel.description}\n\n⚠️ **Nenhuma categoria configurada ainda.**`);
            }
            
            await interaction.update({
                embeds: [mainEmbed],
                components: components
            });
        }
        
    } catch (error) {
        console.error('Erro no handler de fix:', error);
        if (!interaction.replied && !interaction.deferred) {
            await safeReply(interaction, {
                content: '❌ Erro interno do sistema.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

/**
 * Handler para edição básica (título, descrição, cor)
 */
async function handleFixEdit(interaction, client) {
    try {
        const customId = interaction.customId;
        const channelId = customId.split('_')[3];
        const editType = customId.split('_')[2]; // title, description, color
        
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
        
        const panel = database.getFixPanel(channelId);
        if (!panel) {
            return await safeReply(interaction, {
                content: '❌ Painel não encontrado.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Criar modal baseado no tipo de edição
        const modal = new ModalBuilder()
            .setCustomId(`fix_modal_${editType}_${channelId}`)
            .setTitle(`Editar ${editType === 'title' ? 'Título' : editType === 'description' ? 'Descrição' : 'Cor'}`);
        
        let input;
        
        if (editType === 'title') {
            input = new TextInputBuilder()
                .setCustomId('fix_input_value')
                .setLabel('Título do Painel')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('🔧 Sistema de Fix')
                .setValue(panel.title)
                .setRequired(true)
                .setMaxLength(100);
        } else if (editType === 'description') {
            input = new TextInputBuilder()
                .setCustomId('fix_input_value')
                .setLabel('Descrição do Painel')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Selecione uma categoria abaixo para reportar problemas')
                .setValue(panel.description)
                .setRequired(true)
                .setMaxLength(1000);
        } else if (editType === 'color') {
            input = new TextInputBuilder()
                .setCustomId('fix_input_value')
                .setLabel('Cor do Embed (hex)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('#00ff00')
                .setValue(panel.color)
                .setRequired(true)
                .setMaxLength(7);
        } else {
            // Fallback caso não seja nenhum dos tipos esperados
            return await safeReply(interaction, {
                content: '❌ Tipo de edição inválido.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Verificar se input foi criado corretamente
        if (!input) {
            return await safeReply(interaction, {
                content: '❌ Erro ao criar formulário.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);
        
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Erro no edit fix:', error);
        await interaction.reply({
            content: '❌ Erro ao abrir editor.',
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * Handler para modals do sistema de fix
 */
async function handleFixModal(interaction, client) {
    try {
        const customId = interaction.customId;
        const parts = customId.split('_');
        
        // Modal para adicionar categoria
        if (customId.startsWith('fix_modal_add_category_')) {
            const channelId = parts[4];
            
            const name = interaction.fields.getTextInputValue('category_name');
            const emoji = interaction.fields.getTextInputValue('category_emoji');
            const subTitle = interaction.fields.getTextInputValue('category_sub_title');
            const subDescription = interaction.fields.getTextInputValue('category_sub_description');
            const subColor = interaction.fields.getTextInputValue('category_sub_color');
            
            // Validar cor hex
            const hexRegex = /^#[0-9A-F]{6}$/i;
            if (!hexRegex.test(subColor)) {
                return await interaction.reply({
                    content: '❌ Cor inválida! Use o formato hex (ex: #0099ff)',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Gerar ID único para categoria
            const categoryId = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
            
            // Adicionar categoria ao painel
            const success = database.addFixCategory(interaction.guild.id, channelId, categoryId, {
                name: name,
                emoji: emoji,
                subTitle: subTitle,
                subDescription: subDescription,
                subColor: subColor,
                subcategories: {}
            });
            
            if (success) {
                await interaction.reply({
                    content: `✅ Categoria **${emoji} ${name}** adicionada com sucesso!\n\nUse "Atualizar Painel" para aplicar as mudanças.`,
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    content: '❌ Erro ao adicionar categoria.',
                    flags: MessageFlags.Ephemeral
                });
            }
            return;
        }
        
        // Modal para editar categoria
        if (customId.startsWith('fix_modal_edit_category_')) {
            const channelId = parts[4];
            const categoryIndex = parseInt(parts[5]);
            
            const name = interaction.fields.getTextInputValue('category_name');
            const description = interaction.fields.getTextInputValue('category_description');
            const emoji = interaction.fields.getTextInputValue('category_emoji');
            const color = interaction.fields.getTextInputValue('category_color');
            const response = interaction.fields.getTextInputValue('category_response');
            
            // Validar cor hex
            const hexRegex = /^#[0-9A-F]{6}$/i;
            if (!hexRegex.test(color)) {
                return await interaction.reply({
                    content: '❌ Cor inválida! Use o formato hex (ex: #0099ff)',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Obter painel atual
            const panel = database.getFixPanel(channelId);
            if (!panel) {
                return await interaction.reply({
                    content: '❌ Painel não encontrado.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            if (!panel.categories || categoryIndex >= panel.categories.length || categoryIndex < 0) {
                return await interaction.reply({
                    content: '❌ Categoria não encontrada.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Atualizar categoria
            panel.categories[categoryIndex] = {
                ...panel.categories[categoryIndex],
                name: name,
                description: description,
                emoji: emoji,
                color: color,
                response: response
            };
            
            // Salvar no database
            database.setFixPanel(channelId, panel);
            
            await interaction.reply({
                content: `✅ Categoria **${emoji} ${name}** editada com sucesso!`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        
        // Modal para adicionar subcategoria
        if (customId.startsWith('fix_modal_add_subcategory_')) {
            const channelId = parts[4];
            const categoryIndex = parseInt(parts[5]);
            
            const name = interaction.fields.getTextInputValue('subcategory_name');
            const description = interaction.fields.getTextInputValue('subcategory_description');
            const emoji = interaction.fields.getTextInputValue('subcategory_emoji');
            const color = interaction.fields.getTextInputValue('subcategory_color');
            const response = interaction.fields.getTextInputValue('subcategory_response');
            
            // Validar cor hex
            const hexRegex = /^#[0-9A-F]{6}$/i;
            if (!hexRegex.test(color)) {
                return await interaction.reply({
                    content: '❌ Cor inválida! Use o formato hex (ex: #0099ff)',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Obter painel atual
            const panel = database.getFixPanel(channelId);
            if (!panel) {
                return await interaction.reply({
                    content: '❌ Painel não encontrado.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            if (!panel.categories || categoryIndex >= panel.categories.length || categoryIndex < 0) {
                return await interaction.reply({
                    content: '❌ Categoria não encontrada.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Inicializar subcategorias se não existir
            if (!panel.categories[categoryIndex].subcategories) {
                panel.categories[categoryIndex].subcategories = [];
            }
            
            // Adicionar subcategoria
            panel.categories[categoryIndex].subcategories.push({
                name: name,
                description: description,
                emoji: emoji,
                color: color,
                response: response
            });
            
            // Salvar no database
            database.setFixPanel(channelId, panel);
            
            await interaction.reply({
                content: `✅ Subcategoria **${emoji} ${name}** adicionada com sucesso!`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        
        // Modal para editar subcategoria
        if (customId.startsWith('fix_modal_edit_subcategory_')) {
            const channelId = parts[4];
            const categoryIndex = parseInt(parts[5]);
            const subcategoryIndex = parseInt(parts[6]);
            
            const name = interaction.fields.getTextInputValue('subcategory_name');
            const description = interaction.fields.getTextInputValue('subcategory_description');
            const emoji = interaction.fields.getTextInputValue('subcategory_emoji');
            const color = interaction.fields.getTextInputValue('subcategory_color');
            const response = interaction.fields.getTextInputValue('subcategory_response');
            
            // Validar cor hex
            const hexRegex = /^#[0-9A-F]{6}$/i;
            if (!hexRegex.test(color)) {
                return await interaction.reply({
                    content: '❌ Cor inválida! Use o formato hex (ex: #0099ff)',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Obter painel atual
            const panel = database.getFixPanel(channelId);
            if (!panel) {
                return await interaction.reply({
                    content: '❌ Painel não encontrado.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            if (!panel.categories || categoryIndex >= panel.categories.length || categoryIndex < 0) {
                return await interaction.reply({
                    content: '❌ Categoria não encontrada.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const category = panel.categories[categoryIndex];
            if (!category.subcategories || subcategoryIndex >= category.subcategories.length || subcategoryIndex < 0) {
                return await interaction.reply({
                    content: '❌ Subcategoria não encontrada.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Atualizar subcategoria
            panel.categories[categoryIndex].subcategories[subcategoryIndex] = {
                name: name,
                description: description,
                emoji: emoji,
                color: color,
                response: response
            };
            
            // Salvar no database
            database.setFixPanel(channelId, panel);
            
            await interaction.reply({
                content: `✅ Subcategoria **${emoji} ${name}** editada com sucesso!`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        
        // Modal para edição básica (título, descrição, cor)
        const editType = parts[2]; // title, description, color
        const channelId = parts[3];
        
        const value = interaction.fields.getTextInputValue('fix_input_value');
        
        // Validar cor se for edição de cor
        if (editType === 'color') {
            const hexRegex = /^#[0-9A-F]{6}$/i;
            if (!hexRegex.test(value)) {
                return await interaction.reply({
                    content: '❌ Cor inválida! Use o formato hex (ex: #00ff00)',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
        
        // Obter painel atual
        const panel = database.getFixPanel(channelId);
        if (!panel) {
            return await interaction.reply({
                content: '❌ Painel não encontrado.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Atualizar configuração
        if (editType === 'title') panel.title = value;
        else if (editType === 'description') panel.description = value;
        else if (editType === 'color') panel.color = value;
        
        database.setFixPanel(channelId, panel);
        
        await interaction.reply({
            content: `✅ ${editType === 'title' ? 'Título' : editType === 'description' ? 'Descrição' : 'Cor'} atualizado com sucesso!`,
            flags: MessageFlags.Ephemeral
        });
        
    } catch (error) {
        console.error('Erro no modal fix:', error);
        await interaction.reply({
            content: '❌ Erro ao salvar alterações.',
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * Handler para clique em categoria (mostra subcategorias)
 */
async function handleFixCategoryClick(interaction, client) {
    try {
        const parts = interaction.customId.split('_');
        const channelId = parts[2];
        const categoryIndex = parseInt(parts[3]);
        
        const panel = database.getFixPanel(channelId);
        if (!panel || !panel.categories || categoryIndex >= panel.categories.length || categoryIndex < 0) {
            return await interaction.reply({
                content: '❌ Categoria não encontrada.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        const category = panel.categories[categoryIndex];
        
        // Se não há subcategorias, mostrar mensagem da categoria diretamente
        if (!category.subcategories || category.subcategories.length === 0) {
            // Mostrar resposta da categoria principal
            const responseEmbed = new EmbedBuilder()
                .setTitle(`${category.emoji} ${category.name}`)
                .setDescription(category.response)
                .setColor(category.color)
                .setTimestamp()
                .setFooter({ text: 'Ticket criado por ' + interaction.user.username, iconURL: interaction.user.displayAvatarURL() });
            
            await interaction.reply({
                embeds: [responseEmbed],
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        
        // Criar embed com subcategorias
        const subEmbed = new EmbedBuilder()
            .setTitle(`${category.emoji} ${category.name}`)
            .setDescription(category.description)
            .setColor(category.color)
            .setTimestamp();
        
        // Criar botões das subcategorias
        const components = [];
        
        for (let i = 0; i < category.subcategories.length; i += 5) {
            const row = new ActionRowBuilder();
            const subSlice = category.subcategories.slice(i, i + 5);
            
            subSlice.forEach((subcategory, index) => {
                const actualIndex = i + index;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`fix_subcategory_${channelId}_${categoryIndex}_${actualIndex}`)
                        .setLabel(`${subcategory.emoji} ${subcategory.name}`)
                        .setStyle(ButtonStyle.Secondary)
                );
            });
            components.push(row);
        }
        
        // Botão de voltar
        const backRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`fix_back_main_${channelId}`)
                    .setLabel('🔙 Voltar ao Menu Principal')
                    .setStyle(ButtonStyle.Primary)
            );
        components.push(backRow);
        
        await interaction.reply({
            embeds: [subEmbed],
            components: components,
            flags: MessageFlags.Ephemeral
        });
        
    } catch (error) {
        console.error('Erro no clique de categoria:', error);
        await interaction.reply({
            content: '❌ Erro ao carregar subcategorias.',
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * Handler para clique em subcategoria (resposta final)
 */
async function handleFixSubcategoryClick(interaction, client) {
    try {
        const parts = interaction.customId.split('_');
        const channelId = parts[2];
        const categoryIndex = parseInt(parts[3]);
        const subcategoryIndex = parseInt(parts[4]);
        
        const panel = database.getFixPanel(channelId);
        if (!panel || !panel.categories || categoryIndex >= panel.categories.length || categoryIndex < 0) {
            return await interaction.reply({
                content: '❌ Categoria não encontrada.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        const category = panel.categories[categoryIndex];
        if (!category.subcategories || subcategoryIndex >= category.subcategories.length || subcategoryIndex < 0) {
            return await interaction.reply({
                content: '❌ Subcategoria não encontrada.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        const subcategory = category.subcategories[subcategoryIndex];
        
        // Criar embed de resposta
        const responseEmbed = new EmbedBuilder()
            .setTitle(`${subcategory.emoji} ${subcategory.name}`)
            .setDescription(subcategory.response)
            .setColor(subcategory.color)
            .setTimestamp()
            .setFooter({ 
                text: 'Resposta gerada para ' + interaction.user.username, 
                iconURL: interaction.user.displayAvatarURL() 
            });
        
        await interaction.reply({
            embeds: [responseEmbed],
            flags: MessageFlags.Ephemeral
        });
        
        console.log(`🔧 ${interaction.user.tag} acessou: ${category.name} > ${subcategory.name}`);
        
    } catch (error) {
        console.error('Erro no clique de subcategoria:', error);
        await interaction.reply({
            content: '❌ Erro ao carregar resposta.',
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * Handler para gerenciamento de categorias
 */
async function handleFixCategoryManagement(interaction, client) {
    try {
        const channelId = interaction.customId.split('_')[3];
        
        const panel = database.getFixPanel(interaction.guild.id, channelId);
        if (!panel) {
            return await interaction.reply({
                content: '❌ Painel não encontrado.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Criar embed de gerenciamento com categorias atuais
        const manageEmbed = new EmbedBuilder()
            .setTitle('📂 Gerenciar Categorias')
            .setDescription('Use os botões abaixo para gerenciar as categorias do painel')
            .setColor('#0099ff')
            .setTimestamp();
        
        // Mostrar categorias existentes
        const categories = Object.entries(panel.categories);
        if (categories.length > 0) {
            let categoryList = '';
            categories.forEach(([id, data], index) => {
                const subCount = Object.keys(data.subcategories || {}).length;
                categoryList += `${index + 1}. ${data.emoji} **${data.name}** (${subCount} subcategorias)\n`;
            });
            manageEmbed.addFields({
                name: '� Categorias Existentes',
                value: categoryList || 'Nenhuma categoria criada',
                inline: false
            });
        } else {
            manageEmbed.addFields({
                name: '📋 Categorias',
                value: 'Nenhuma categoria criada ainda',
                inline: false
            });
        }
        
        // Criar botões de gerenciamento
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`fix_add_category_${channelId}`)
                    .setLabel('➕ Adicionar Categoria')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`fix_list_categories_${channelId}`)
                    .setLabel('📝 Editar Categoria')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(categories.length === 0),
                new ButtonBuilder()
                    .setCustomId(`fix_delete_category_${channelId}`)
                    .setLabel('🗑️ Deletar Categoria')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(categories.length === 0)
            );
        
        await interaction.reply({
            embeds: [manageEmbed],
            components: [row1],
            flags: MessageFlags.Ephemeral
        });
        
    } catch (error) {
        console.error('Erro no gerenciamento de categorias:', error);
        await interaction.reply({
            content: '❌ Erro ao carregar gerenciamento.',
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * Handler para preview do painel
 */
async function handleFixPreview(interaction, client) {
    try {
        const channelId = interaction.customId.split('_')[2];
        
        const panel = database.getFixPanel(channelId);
        if (!panel) {
            return await interaction.reply({
                content: '❌ Painel não encontrado.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Criar preview do painel
        const previewEmbed = new EmbedBuilder()
            .setTitle(panel.title)
            .setDescription(panel.description)
            .setColor(panel.color)
            .setTimestamp()
            .setFooter({ text: 'Preview do painel - Como aparecerá para os usuários' });
        
        // Criar botões das categorias se existirem
        const components = [];
        
        if (panel.categories && panel.categories.length > 0) {
            for (let i = 0; i < panel.categories.length; i += 5) {
                const row = new ActionRowBuilder();
                const categorySlice = panel.categories.slice(i, i + 5);
                
                categorySlice.forEach((category, index) => {
                    const actualIndex = i + index;
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`preview_category_${actualIndex}`)
                            .setLabel(`${category.emoji} ${category.name}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true) // Desabilitado para preview
                    );
                });
                components.push(row);
            }
        } else {
            previewEmbed.setDescription(`${panel.description}\n\n⚠️ **Nenhuma categoria configurada ainda.**`);
        }
        
        await interaction.reply({
            embeds: [previewEmbed],
            components: components,
            flags: MessageFlags.Ephemeral
        });
        
    } catch (error) {
        console.error('Erro no preview:', error);
        await interaction.reply({
            content: '❌ Erro ao gerar preview.',
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * Handler para atualização do painel
 */
async function handleFixPanelUpdate(interaction, client) {
    try {
        const channelId = interaction.customId.split('_')[3];
        
        const panel = database.getFixPanel(channelId);
        if (!panel) {
            return await interaction.reply({
                content: '❌ Painel não encontrado.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Buscar mensagem do painel no canal
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            return await interaction.reply({
                content: '❌ Canal não encontrado.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Buscar mensagens recentes do bot
        const messages = await channel.messages.fetch({ limit: 50 });
        let panelMessage = null;
        
        for (const message of messages.values()) {
            if (message.author.id === client.user.id && 
                message.embeds.length > 0 && 
                message.embeds[0].title && 
                (message.embeds[0].title.includes('Fix') || message.embeds[0].title.includes('🔧'))) {
                panelMessage = message;
                break;
            }
        }
        
        if (!panelMessage) {
            return await interaction.reply({
                content: '❌ Mensagem do painel não encontrada. Crie um novo painel com /set-fix.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Atualizar embed
        const updatedEmbed = new EmbedBuilder()
            .setTitle(panel.title)
            .setDescription(panel.description)
            .setColor(panel.color)
            .setTimestamp();
        
        // Criar botões das categorias
        const components = [];
        
        if (panel.categories && panel.categories.length > 0) {
            for (let i = 0; i < panel.categories.length; i += 5) {
                const row = new ActionRowBuilder();
                const categorySlice = panel.categories.slice(i, i + 5);
                
                categorySlice.forEach((category, index) => {
                    const actualIndex = i + index;
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`fix_category_${channelId}_${actualIndex}`)
                            .setLabel(`${category.emoji} ${category.name}`)
                            .setStyle(ButtonStyle.Secondary)
                    );
                });
                components.push(row);
            }
        } else {
            // Se não houver categorias, mostrar mensagem informativa
            updatedEmbed.setDescription(`${panel.description}\n\n⚠️ **Nenhuma categoria configurada ainda.**\nUse o comando \`/config-fix\` para adicionar categorias.`);
        }
        
        // Atualizar mensagem
        await panelMessage.edit({
            embeds: [updatedEmbed],
            components: components
        });
        
        await interaction.reply({
            content: '✅ Painel atualizado com sucesso!',
            flags: MessageFlags.Ephemeral
        });
        
    } catch (error) {
        console.error('Erro na atualização do painel:', error);
        await interaction.reply({
            content: '❌ Erro ao atualizar painel.',
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * Handler para adicionar nova categoria
 */
async function handleFixAddCategory(interaction, client) {
    try {
        const channelId = interaction.customId.split('_')[3];
        
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
        
        // Criar modal para nova categoria
        const modal = new ModalBuilder()
            .setCustomId(`fix_modal_add_category_${channelId}`)
            .setTitle('➕ Adicionar Nova Categoria');
        
        const nameInput = new TextInputBuilder()
            .setCustomId('category_name')
            .setLabel('Nome da Categoria')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Spoofer')
            .setRequired(true)
            .setMaxLength(50);
        
        const emojiInput = new TextInputBuilder()
            .setCustomId('category_emoji')
            .setLabel('Emoji da Categoria')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('🔧')
            .setRequired(true)
            .setMaxLength(2);
        
        const subTitleInput = new TextInputBuilder()
            .setCustomId('category_sub_title')
            .setLabel('Título do Sub-Embed')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Problemas com Spoofer')
            .setRequired(true)
            .setMaxLength(100);
        
        const subDescInput = new TextInputBuilder()
            .setCustomId('category_sub_description')
            .setLabel('Descrição do Sub-Embed')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Selecione o tipo de problema que você está enfrentando')
            .setRequired(true)
            .setMaxLength(500);
        
        const subColorInput = new TextInputBuilder()
            .setCustomId('category_sub_color')
            .setLabel('Cor do Sub-Embed (hex)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#0099ff')
            .setRequired(true)
            .setMaxLength(7);
        
        const row1 = new ActionRowBuilder().addComponents(nameInput);
        const row2 = new ActionRowBuilder().addComponents(emojiInput);
        const row3 = new ActionRowBuilder().addComponents(subTitleInput);
        const row4 = new ActionRowBuilder().addComponents(subDescInput);
        const row5 = new ActionRowBuilder().addComponents(subColorInput);
        
        modal.addComponents(row1, row2, row3, row4, row5);
        
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('Erro ao adicionar categoria:', error);
        await interaction.reply({
            content: '❌ Erro ao abrir formulário.',
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * Handler para listar e editar categorias
 */
async function handleFixListCategories(interaction, client) {
    try {
        const channelId = interaction.customId.split('_')[3];
        
        const panel = database.getFixPanel(channelId);
        if (!panel) {
            return await safeReply(interaction, {
                content: '❌ Painel não encontrado.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        if (!panel.categories || panel.categories.length === 0) {
            return await safeReply(interaction, {
                content: '❌ Nenhuma categoria criada ainda.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Criar embed com lista de categorias
        const listEmbed = new EmbedBuilder()
            .setTitle('📝 Editar Categorias')
            .setDescription('Selecione uma categoria para editar')
            .setColor('#0099ff')
            .setTimestamp();
        
        // Criar botões para cada categoria
        const components = [];
        for (let i = 0; i < panel.categories.length; i += 5) {
            const row = new ActionRowBuilder();
            const categorySlice = panel.categories.slice(i, i + 5);
            
            categorySlice.forEach((category, index) => {
                const actualIndex = i + index;
                const subCount = category.subcategories ? category.subcategories.length : 0;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`fix_edit_cat_${channelId}_${actualIndex}`)
                        .setLabel(`${category.emoji} ${category.name} (${subCount})`)
                        .setStyle(ButtonStyle.Secondary)
                );
            });
            components.push(row);
        }
        
        await safeReply(interaction, {
            embeds: [listEmbed],
            components: components,
            flags: MessageFlags.Ephemeral
        });
        
    } catch (error) {
        console.error('Erro ao listar categorias:', error);
        if (!interaction.replied && !interaction.deferred) {
            await safeReply(interaction, {
                content: '❌ Erro ao carregar categorias.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

/**
 * Handler para deletar categoria
 */
async function handleFixDeleteCategory(interaction, client) {
    try {
        const channelId = interaction.customId.split('_')[3];
        
        const panel = database.getFixPanel(interaction.guild.id, channelId);
        if (!panel || Object.keys(panel.categories).length === 0) {
            return await interaction.reply({
                content: '❌ Nenhuma categoria para deletar.',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Criar embed de confirmação
        const deleteEmbed = new EmbedBuilder()
            .setTitle('🗑️ Deletar Categoria')
            .setDescription('⚠️ **ATENÇÃO:** Esta ação é irreversível!\n\nSelecione a categoria que deseja deletar:')
            .setColor('#ff0000')
            .setTimestamp();
        
        // Criar botões para cada categoria
        const components = [];
        const categories = Object.entries(panel.categories);
        
        for (let i = 0; i < categories.length; i += 5) {
            const row = new ActionRowBuilder();
            const categorySlice = categories.slice(i, i + 5);
            
            for (const [categoryId, categoryData] of categorySlice) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`fix_confirm_delete_${channelId}_${categoryId}`)
                        .setLabel(`${categoryData.emoji} ${categoryData.name}`)
                        .setStyle(ButtonStyle.Danger)
                );
            }
            components.push(row);
        }
        
        await interaction.reply({
            embeds: [deleteEmbed],
            components: components,
            flags: MessageFlags.Ephemeral
        });
        
    } catch (error) {
        console.error('Erro ao deletar categoria:', error);
        await interaction.reply({
            content: '❌ Erro ao carregar categorias.',
            flags: MessageFlags.Ephemeral
        });
    }
}

// Função para editar uma categoria específica
async function handleFixEditCategory(interaction, client) {
    const customIdParts = interaction.customId.split('_');
    const channelId = customIdParts[3];
    const categoryIndex = parseInt(customIdParts[4]);
    
    const panel = database.getFixPanel(interaction.guild.id, channelId);
    
    if (!panel) {
        return await interaction.reply({
            content: '❌ Painel não encontrado.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (!panel.categories || categoryIndex >= panel.categories.length || categoryIndex < 0) {
        return await interaction.reply({
            content: '❌ Categoria não encontrada.',
            flags: MessageFlags.Ephemeral
        });
    }

    const category = panel.categories[categoryIndex];

    const modal = new ModalBuilder()
        .setCustomId(`fix_modal_edit_category_${channelId}_${categoryIndex}`)
        .setTitle('Editar Categoria');

    const nameInput = new TextInputBuilder()
        .setCustomId('category_name')
        .setLabel('Nome da Categoria')
        .setStyle(TextInputStyle.Short)
        .setValue(category.name)
        .setRequired(true)
        .setMaxLength(80);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('category_description')
        .setLabel('Descrição da Categoria')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(category.description)
        .setRequired(true)
        .setMaxLength(300);

    const emojiInput = new TextInputBuilder()
        .setCustomId('category_emoji')
        .setLabel('Emoji da Categoria')
        .setStyle(TextInputStyle.Short)
        .setValue(category.emoji)
        .setRequired(true)
        .setMaxLength(10);

    const colorInput = new TextInputBuilder()
        .setCustomId('category_color')
        .setLabel('Cor da Categoria (hex)')
        .setStyle(TextInputStyle.Short)
        .setValue(category.color)
        .setRequired(true)
        .setMaxLength(7);

    const responseInput = new TextInputBuilder()
        .setCustomId('category_response')
        .setLabel('Resposta da Categoria')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(category.response)
        .setRequired(true)
        .setMaxLength(1000);

    const row1 = new ActionRowBuilder().addComponents(nameInput);
    const row2 = new ActionRowBuilder().addComponents(descriptionInput);
    const row3 = new ActionRowBuilder().addComponents(emojiInput);
    const row4 = new ActionRowBuilder().addComponents(colorInput);
    const row5 = new ActionRowBuilder().addComponents(responseInput);

    modal.addComponents(row1, row2, row3, row4, row5);
    await interaction.showModal(modal);
}

// Função para deletar uma categoria específica
async function handleFixDeleteCategory(interaction, client) {
    const channelId = interaction.customId.split('_')[3];
    const categoryIndex = parseInt(interaction.customId.split('_')[4]);
    
    const panel = database.getFixPanel(channelId);
    if (!panel) {
        return await interaction.reply({
            content: '❌ Painel não encontrado.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (!panel.categories || categoryIndex >= panel.categories.length || categoryIndex < 0) {
        return await interaction.reply({
            content: '❌ Categoria não encontrada.',
            flags: MessageFlags.Ephemeral
        });
    }

    const category = panel.categories[categoryIndex];

    const confirmEmbed = new EmbedBuilder()
        .setTitle('⚠️ Confirmar Exclusão')
        .setDescription(`Tem certeza que deseja deletar a categoria **${category.name}**?\n\n**Esta ação não pode ser desfeita!**`)
        .setColor('#ff0000');

    const confirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`fix_confirm_delete_${channelId}_${categoryIndex}`)
                .setLabel('✅ Confirmar')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`fix_cancel_delete_${channelId}`)
                .setLabel('❌ Cancelar')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({
        embeds: [confirmEmbed],
        components: [confirmButtons],
        flags: MessageFlags.Ephemeral
    });
}

// Função para gerenciar subcategorias
async function handleFixManageSubcategories(interaction, client) {
    const channelId = interaction.customId.split('_')[3];
    const categoryIndex = parseInt(interaction.customId.split('_')[4]);
    
    const panel = database.getFixPanel(channelId);
    if (!panel) {
        return await interaction.reply({
            content: '❌ Painel não encontrado.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (!panel.categories || categoryIndex >= panel.categories.length || categoryIndex < 0) {
        return await interaction.reply({
            content: '❌ Categoria não encontrada.',
            flags: MessageFlags.Ephemeral
        });
    }

    const category = panel.categories[categoryIndex];

    const embed = new EmbedBuilder()
        .setTitle(`🔧 Gerenciar Subcategorias - ${category.name}`)
        .setColor(category.color || '#00ff00');

    if (!category.subcategories || category.subcategories.length === 0) {
        embed.setDescription('**Nenhuma subcategoria encontrada.**\n\nClique no botão abaixo para adicionar a primeira subcategoria.');
    } else {
        let description = '**Subcategorias existentes:**\n\n';
        category.subcategories.forEach((sub, index) => {
            description += `**${index + 1}.** ${sub.emoji} ${sub.name}\n`;
            description += `└ *${sub.description}*\n\n`;
        });
        embed.setDescription(description);
    }

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`fix_add_sub_${channelId}_${categoryIndex}`)
                .setLabel('➕ Adicionar Subcategoria')
                .setStyle(ButtonStyle.Success)
        );

    if (category.subcategories && category.subcategories.length > 0) {
        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId(`fix_list_subs_${channelId}_${categoryIndex}`)
                .setLabel('📝 Editar Subcategorias')
                .setStyle(ButtonStyle.Primary)
        );
    }

    buttons.addComponents(
        new ButtonBuilder()
            .setCustomId(`fix_back_categories_${channelId}`)
            .setLabel('🔙 Voltar')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
        embeds: [embed],
        components: [buttons],
        flags: MessageFlags.Ephemeral
    });
}

// Função para adicionar subcategoria
async function handleFixAddSubcategory(interaction, client) {
    const channelId = interaction.customId.split('_')[3];
    const categoryIndex = parseInt(interaction.customId.split('_')[4]);
    
    const panel = database.getFixPanel(channelId);
    if (!panel) {
        return await interaction.reply({
            content: '❌ Painel não encontrado.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (!panel.categories || categoryIndex >= panel.categories.length || categoryIndex < 0) {
        return await interaction.reply({
            content: '❌ Categoria não encontrada.',
            flags: MessageFlags.Ephemeral
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`fix_modal_add_subcategory_${channelId}_${categoryIndex}`)
        .setTitle('Nova Subcategoria');

    const nameInput = new TextInputBuilder()
        .setCustomId('subcategory_name')
        .setLabel('Nome da Subcategoria')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Erro de Login')
        .setRequired(true)
        .setMaxLength(80);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('subcategory_description')
        .setLabel('Descrição da Subcategoria')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Ex: Problemas relacionados ao login no sistema')
        .setRequired(true)
        .setMaxLength(300);

    const emojiInput = new TextInputBuilder()
        .setCustomId('subcategory_emoji')
        .setLabel('Emoji da Subcategoria')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('🔑')
        .setRequired(true)
        .setMaxLength(10);

    const colorInput = new TextInputBuilder()
        .setCustomId('subcategory_color')
        .setLabel('Cor da Subcategoria (hex)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('#ff0000')
        .setRequired(true)
        .setMaxLength(7);

    const responseInput = new TextInputBuilder()
        .setCustomId('subcategory_response')
        .setLabel('Resposta da Subcategoria')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Obrigado por reportar! Nossa equipe verificará o problema...')
        .setRequired(true)
        .setMaxLength(1000);

    const row1 = new ActionRowBuilder().addComponents(nameInput);
    const row2 = new ActionRowBuilder().addComponents(descriptionInput);
    const row3 = new ActionRowBuilder().addComponents(emojiInput);
    const row4 = new ActionRowBuilder().addComponents(colorInput);
    const row5 = new ActionRowBuilder().addComponents(responseInput);

    modal.addComponents(row1, row2, row3, row4, row5);
    await interaction.showModal(modal);
}

// ========== HANDLERS DO SISTEMA DE GERENCIAMENTO ==========

/**
 * Handler para copiar key
 */
async function handleCopyKey(interaction, client) {
    const keyToCopy = interaction.customId.replace('copy_key_', '');
    
    await interaction.reply({
        content: keyToCopy,
        flags: ['Ephemeral']
    });
}

/**
 * Handler para gerenciamento de keys
 */
async function handleManageKeys(interaction, client) {
    // Verificar se é admin
    if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
        return interaction.reply({
            content: '❌ Você não tem permissão para usar este comando.',
            flags: ['Ephemeral']
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('🔑 Scarlet ® - Gerenciamento de Keys')
        .setDescription('**⚙️ | Selecione uma opção para gerenciar keys:**\n\n' +
                       '🆕 **Criar Key** - Criar uma nova chave de licença\n' +
                       '🗑️ **Deletar Key** - Remover uma chave existente\n' +
                       '🔍 **Verificar Key** - Verificar status de uma chave\n' +
                       '🔒 **Banir Key** - Banir uma chave específica\n' +
                       '🔓 **Desbanir Key** - Desbanir uma chave')
        .setColor('#e74c3c')
        .setFooter({ text: 'Scarlet ® • Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('key_create')
                .setLabel('🆕 Criar Key')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('key_delete')
                .setLabel('🗑️ Deletar Key')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('key_verify')
                .setLabel('🔍 Verificar Key')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('key_ban')
                .setLabel('🔒 Banir Key')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('key_unban')
                .setLabel('🔓 Desbanir Key')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: ['Ephemeral']
    });
}

/**
 * Handler para gerenciamento de usuários
 */
async function handleManageUsers(interaction, client) {
    // Verificar se é admin
    if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
        return interaction.reply({
            content: '❌ Você não tem permissão para usar este comando.',
            flags: ['Ephemeral']
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('👥 Scarlet ® - Gerenciamento de Usuários')
        .setDescription('**⚙️ | Selecione uma opção para gerenciar usuários:**\n\n' +
                       '🔒 **Banir User** - Banir um usuário do sistema\n' +
                       '🔓 **Desbanir User** - Desbanir um usuário\n' +
                       '⚙️ **Resetar HWID** - Resetar HWID de um usuário\n' +
                       '🔍 **Verificar User** - Verificar se usuário existe\n' +
                       '⏰ **Extender User** - Extender tempo de um usuário\n' +
                       '🌐 **Extender Todos** - Extender tempo de todos usuários')
        .setColor('#3498db')
        .setFooter({ text: 'Scarlet ® • Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
        .setTimestamp();

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('user_ban')
                .setLabel('🔒 Banir User')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('user_unban')
                .setLabel('🔓 Desbanir User')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('user_reset_hwid')
                .setLabel('⚙️ Resetar HWID')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('user_verify')
                .setLabel('🔍 Verificar User')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('user_extend')
                .setLabel('⏰ Extender User')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('user_extend_all')
                .setLabel('🌐 Extender Todos')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({
        embeds: [embed],
        components: [row1, row2],
        flags: ['Ephemeral']
    });
}

/**
 * Handler para botões de gerenciamento de keys
 */
async function handleKeyManagementButtons(interaction, client) {
    const action = interaction.customId.split('_')[1];

    switch (action) {
        case 'create':
            await handleKeyCreate(interaction);
            break;
        case 'delete':
            await handleKeyDelete(interaction);
            break;
        case 'verify':
            await handleKeyVerify(interaction);
            break;
        case 'ban':
            await handleKeyBan(interaction);
            break;
        case 'unban':
            await handleKeyUnban(interaction);
            break;
        default:
            await interaction.reply({
                content: '❌ Ação não reconhecida.',
                flags: ['Ephemeral']
            });
    }
}

/**
 * Handler para criar key
 */
async function handleKeyCreate(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('key_modal_create')
        .setTitle('🆕 Criar Nova Key');

    const durationInput = new TextInputBuilder()
        .setCustomId('key_duration')
        .setLabel('Duração da Key')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('diaria, semanal, mensal, trimensal, lifetime')
        .setRequired(true)
        .setMaxLength(20);

    const amountInput = new TextInputBuilder()
        .setCustomId('key_amount')
        .setLabel('Quantidade de Keys')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1')
        .setValue('1')
        .setRequired(true)
        .setMaxLength(3);

    const noteInput = new TextInputBuilder()
        .setCustomId('key_note')
        .setLabel('Nota (opcional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Observações sobre esta key...')
        .setRequired(false)
        .setMaxLength(200);

    const row1 = new ActionRowBuilder().addComponents(durationInput);
    const row2 = new ActionRowBuilder().addComponents(amountInput);
    const row3 = new ActionRowBuilder().addComponents(noteInput);

    modal.addComponents(row1, row2, row3);
    await interaction.showModal(modal);
}

/**
 * Handler para deletar key
 */
async function handleKeyDelete(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('key_modal_delete')
        .setTitle('🗑️ Deletar Key');

    const keyInput = new TextInputBuilder()
        .setCustomId('key_to_delete')
        .setLabel('Key para deletar')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('SCARLET-XXXX-XXXX-XXXX')
        .setRequired(true)
        .setMaxLength(100);

    const confirmInput = new TextInputBuilder()
        .setCustomId('delete_confirm')
        .setLabel('Digite "CONFIRMAR" para deletar')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('CONFIRMAR')
        .setRequired(true)
        .setMaxLength(15);

    const row1 = new ActionRowBuilder().addComponents(keyInput);
    const row2 = new ActionRowBuilder().addComponents(confirmInput);

    modal.addComponents(row1, row2);
    await interaction.showModal(modal);
}

/**
 * Handler para verificar key
 */
async function handleKeyVerify(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('key_modal_verify')
        .setTitle('🔍 Verificar Key');

    const keyInput = new TextInputBuilder()
        .setCustomId('key_to_verify')
        .setLabel('Key para verificar')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('SCARLET-XXXX-XXXX-XXXX')
        .setRequired(true)
        .setMaxLength(100);

    const row = new ActionRowBuilder().addComponents(keyInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
}

/**
 * Handler para banir key
 */
async function handleKeyBan(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('key_modal_ban')
        .setTitle('🔒 Banir Key');

    const keyInput = new TextInputBuilder()
        .setCustomId('key_to_ban')
        .setLabel('Key para banir')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('SCARLET-XXXX-XXXX-XXXX')
        .setRequired(true)
        .setMaxLength(100);

    const reasonInput = new TextInputBuilder()
        .setCustomId('ban_reason')
        .setLabel('Motivo do banimento')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Motivo para banir esta key...')
        .setRequired(true)
        .setMaxLength(200);

    const row1 = new ActionRowBuilder().addComponents(keyInput);
    const row2 = new ActionRowBuilder().addComponents(reasonInput);

    modal.addComponents(row1, row2);
    await interaction.showModal(modal);
}

/**
 * Handler para desbanir key
 */
async function handleKeyUnban(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('key_modal_unban')
        .setTitle('🔓 Desbanir Key');

    const keyInput = new TextInputBuilder()
        .setCustomId('key_to_unban')
        .setLabel('Key para desbanir')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('SCARLET-XXXX-XXXX-XXXX')
        .setRequired(true)
        .setMaxLength(100);

    const row = new ActionRowBuilder().addComponents(keyInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
}

/**
 * Handler para modais de keys
 */
async function handleKeyModals(interaction, client) {
    const action = interaction.customId.split('_')[2]; // create, delete, verify, ban, unban
    
    await interaction.deferReply({ flags: ['Ephemeral'] });

    const sellerKey = process.env.KEYAUTH_SELLER_KEY;
    if (!sellerKey) {
        return await interaction.editReply({
            content: '❌ Configuração do servidor incorreta. KEYAUTH_SELLER_KEY não encontrada.'
        });
    }

    try {
        switch (action) {
            case 'create':
                await handleKeyCreateModal(interaction, sellerKey);
                break;
            case 'delete':
                await handleKeyDeleteModal(interaction, sellerKey);
                break;
            case 'verify':
                await handleKeyVerifyModal(interaction, sellerKey);
                break;
            case 'ban':
                await handleKeyBanModal(interaction, sellerKey);
                break;
            case 'unban':
                await handleKeyUnbanModal(interaction, sellerKey);
                break;
            default:
                await interaction.editReply({
                    content: '❌ Ação não reconhecida.'
                });
        }
    } catch (error) {
        console.error('Erro no modal de key:', error);
        await interaction.editReply({
            content: '❌ Erro interno. Tente novamente.'
        });
    }
}

/**
 * Modal para criar key
 */
async function handleKeyCreateModal(interaction, sellerKey) {
    const duration = interaction.fields.getTextInputValue('key_duration').toLowerCase().trim();
    const amount = parseInt(interaction.fields.getTextInputValue('key_amount')) || 1;
    const note = interaction.fields.getTextInputValue('key_note') || '';

    // Mapear durações
    const durationMap = {
        'diaria': { days: 1, suffix: 'DIARIO' },
        'semanal': { days: 7, suffix: 'SEMANAL' },
        'mensal': { days: 30, suffix: 'MENSAL' },
        'trimensal': { days: 90, suffix: 'TRIMENSAL' },
        'lifetime': { days: 9999, suffix: 'LIFETIME' }
    };

    if (!durationMap[duration]) {
        return await interaction.editReply({
            content: '❌ Duração inválida! Use: diaria, semanal, mensal, trimensal, lifetime'
        });
    }

    const keyData = durationMap[duration];
    const mask = `SCARLET-****-****-${keyData.suffix}`;
    const expiry = keyData.days;

    // Fazer requisição para API
    const apiUrl = `https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=add&format=${mask}&expiry=${expiry}&mask=${mask}&level=1&amount=${amount}&owner=${interaction.user.id}&character=1&note=${encodeURIComponent(note)}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const result = await response.text();
        console.log('Resultado da criação de key:', result);

        // Verificar se foi sucesso
        let resultData;
        try {
            resultData = JSON.parse(result);
        } catch (e) {
            // Se não for JSON, assumir que é sucesso se contiver "success"
            if (result.includes('success') || result.includes('Success')) {
                // Tentar extrair a key do resultado se possível
                const keyMatch = result.match(/SCARLET-[A-Z0-9]+-[A-Z0-9]+-[A-Z]+/);
                let components = [];
                let responseText = `✅ **Key(s) criada(s) com sucesso!**\n\n**Duração:** ${duration}\n**Quantidade:** ${amount}\n**Máscara:** \`${mask}\`\n**Nota:** ${note || 'Nenhuma'}\n\n🎉 As keys foram adicionadas ao sistema!`;
                
                if (keyMatch) {
                    const extractedKey = keyMatch[0];
                    responseText = `✅ **Key criada com sucesso!**\n\n**Duração:** ${duration}\n**Key:** \`${extractedKey}\`\n**Nota:** ${note || 'Nenhuma'}\n\n🎉 A key foi adicionada ao sistema!`;
                    
                    // Adicionar botão para copiar
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`copy_key_${extractedKey}`)
                                .setLabel('📋 Copiar Key')
                                .setStyle(ButtonStyle.Secondary)
                        );
                    components.push(row);
                }
                
                return await interaction.editReply({
                    content: responseText,
                    components: components
                });
            } else {
                return await interaction.editReply({
                    content: `❌ **Erro ao criar key:**\n\`${result}\``
                });
            }
        }

        if (resultData.success) {
            // Sucesso - mostrar informações das keys criadas
            let responseText = `✅ **Key(s) criada(s) com sucesso!**\n\n`;
            responseText += `**Duração:** ${duration}\n`;
            responseText += `**Quantidade:** ${amount}\n`;
            responseText += `**Máscara:** \`${mask}\`\n`;
            responseText += `**Nota:** ${note || 'Nenhuma'}\n\n`;
            
            let components = [];
            
            if (resultData.keys && Array.isArray(resultData.keys)) {
                responseText += `**Keys criadas:**\n`;
                resultData.keys.forEach((key, index) => {
                    responseText += `${index + 1}. \`${key}\`\n`;
                });
                
                // Criar botões para cada key (máximo 5 por linha)
                for (let i = 0; i < resultData.keys.length && i < 25; i += 5) {
                    const row = new ActionRowBuilder();
                    const keySlice = resultData.keys.slice(i, i + 5);
                    
                    keySlice.forEach((key, subIndex) => {
                        const actualIndex = i + subIndex;
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`copy_key_${key}`)
                                .setLabel(`📋 Copiar Key ${actualIndex + 1}`)
                                .setStyle(ButtonStyle.Secondary)
                        );
                    });
                    components.push(row);
                }
            } else if (resultData.key) {
                responseText += `**Key criada:** \`${resultData.key}\`\n`;
                
                // Criar botão para copiar a key única
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`copy_key_${resultData.key}`)
                            .setLabel('📋 Copiar Key')
                            .setStyle(ButtonStyle.Secondary)
                    );
                components.push(row);
            }
            
            responseText += `\n🎉 As keys foram adicionadas ao sistema!`;
            
            await interaction.editReply({
                content: responseText,
                components: components
            });
        } else {
            await interaction.editReply({
                content: `❌ **Erro ao criar key:**\n${resultData.message || 'Erro desconhecido'}`
            });
        }

    } catch (error) {
        console.error('Erro na API de criação:', error);
        await interaction.editReply({
            content: '❌ Erro ao comunicar com a API. Tente novamente.'
        });
    }
}

/**
 * Modal para deletar key
 */
async function handleKeyDeleteModal(interaction, sellerKey) {
    const keyToDelete = interaction.fields.getTextInputValue('key_to_delete').trim();
    const confirmation = interaction.fields.getTextInputValue('delete_confirm').trim().toUpperCase();

    if (confirmation !== 'CONFIRMAR') {
        return await interaction.editReply({
            content: '❌ Confirmação incorreta. Digite "CONFIRMAR" para deletar a key.'
        });
    }

    // Fazer requisição para API
    const apiUrl = `https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=del&key=${keyToDelete}&userToo=0`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const result = await response.text();
        console.log('Resultado da deleção de key:', result);

        // Verificar se foi sucesso
        if (result.includes('success') || result.includes('Success')) {
            await interaction.editReply({
                content: `✅ **Key deletada com sucesso!**\n\n**Key:** \`${keyToDelete}\`\n\n🗑️ A key foi removida do sistema.`
            });
        } else {
            await interaction.editReply({
                content: `❌ **Erro ao deletar key:**\n\`${result}\``
            });
        }

    } catch (error) {
        console.error('Erro na API de deleção:', error);
        await interaction.editReply({
            content: '❌ Erro ao comunicar com a API. Tente novamente.'
        });
    }
}

/**
 * Modal para verificar key
 */
async function handleKeyVerifyModal(interaction, sellerKey) {
    const keyToVerify = interaction.fields.getTextInputValue('key_to_verify').trim();

    // Fazer requisição para API
    const apiUrl = `https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=verify&key=${keyToVerify}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const result = await response.text();
        console.log('Resultado da verificação de key:', result);

        // Tentar fazer parse do JSON
        let resultData;
        try {
            resultData = JSON.parse(result);
        } catch (e) {
            // Se não for JSON, verificar se contém "success"
            if (result.includes('success') || result.includes('Success')) {
                return await interaction.editReply({
                    content: `✅ **Key válida!**\n\n**Key:** \`${keyToVerify}\`\n\n🔍 A key existe no sistema.`
                });
            } else {
                return await interaction.editReply({
                    content: `❌ **Key inválida ou não encontrada!**\n\n**Key:** \`${keyToVerify}\`\n**Resultado:** \`${result}\``
                });
            }
        }

        if (resultData.success) {
            let responseText = `✅ **Informações da Key**\n\n`;
            responseText += `**Key:** \`${keyToVerify}\`\n`;
            responseText += `**Status:** Válida ✅\n`;
            
            if (resultData.expires) {
                responseText += `**Expira em:** ${resultData.expires}\n`;
            }
            if (resultData.level) {
                responseText += `**Level:** ${resultData.level}\n`;
            }
            if (resultData.note) {
                responseText += `**Nota:** ${resultData.note}\n`;
            }
            if (resultData.used_by) {
                responseText += `**Usado por:** ${resultData.used_by}\n`;
            }
            
            await interaction.editReply({
                content: responseText
            });
        } else {
            await interaction.editReply({
                content: `❌ **Key inválida ou não encontrada!**\n\n**Key:** \`${keyToVerify}\`\n**Motivo:** ${resultData.message || 'Key não existe'}`
            });
        }

    } catch (error) {
        console.error('Erro na API de verificação:', error);
        await interaction.editReply({
            content: '❌ Erro ao comunicar com a API. Tente novamente.'
        });
    }
}

/**
 * Modal para banir key
 */
async function handleKeyBanModal(interaction, sellerKey) {
    const keyToBan = interaction.fields.getTextInputValue('key_to_ban').trim();
    const reason = interaction.fields.getTextInputValue('ban_reason').trim();

    // Fazer requisição para API
    const apiUrl = `https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=ban&key=${keyToBan}&reason=${encodeURIComponent(reason)}&userToo=0`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const result = await response.text();
        console.log('Resultado do banimento de key:', result);

        // Verificar se foi sucesso
        if (result.includes('success') || result.includes('Success')) {
            await interaction.editReply({
                content: `✅ **Key banida com sucesso!**\n\n**Key:** \`${keyToBan}\`\n**Motivo:** ${reason}\n\n🔒 A key foi banida do sistema.`
            });
        } else {
            await interaction.editReply({
                content: `❌ **Erro ao banir key:**\n\`${result}\``
            });
        }

    } catch (error) {
        console.error('Erro na API de banimento:', error);
        await interaction.editReply({
            content: '❌ Erro ao comunicar com a API. Tente novamente.'
        });
    }
}

/**
 * Modal para desbanir key
 */
async function handleKeyUnbanModal(interaction, sellerKey) {
    const keyToUnban = interaction.fields.getTextInputValue('key_to_unban').trim();

    // Fazer requisição para API
    const apiUrl = `https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=unban&key=${keyToUnban}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const result = await response.text();
        console.log('Resultado do desbanimento de key:', result);

        // Verificar se foi sucesso
        if (result.includes('success') || result.includes('Success')) {
            await interaction.editReply({
                content: `✅ **Key desbanida com sucesso!**\n\n**Key:** \`${keyToUnban}\`\n\n🔓 A key foi desbanida do sistema.`
            });
        } else {
            await interaction.editReply({
                content: `❌ **Erro ao desbanir key:**\n\`${result}\``
            });
        }

    } catch (error) {
        console.error('Erro na API de desbanimento:', error);
        await interaction.editReply({
            content: '❌ Erro ao comunicar com a API. Tente novamente.'
        });
    }
}

// ========== HANDLERS DO SISTEMA DE GERENCIAMENTO DE USUÁRIOS ==========

/**
 * Handler para botões de gerenciamento de usuários
 */
async function handleUserManagementButtons(interaction, client) {
    const action = interaction.customId.split('_')[1];

    switch (action) {
        case 'ban':
            await handleUserBan(interaction);
            break;
        case 'unban':
            await handleUserUnban(interaction);
            break;
        case 'reset':
            if (interaction.customId === 'user_reset_hwid') {
                await handleUserResetHwid(interaction);
            }
            break;
        case 'verify':
            await handleUserVerify(interaction);
            break;
        case 'extend':
            if (interaction.customId === 'user_extend') {
                await handleUserExtend(interaction);
            } else if (interaction.customId === 'user_extend_all') {
                await handleUserExtendAll(interaction);
            }
            break;
        default:
            await interaction.reply({
                content: '❌ Ação não reconhecida.',
                flags: ['Ephemeral']
            });
    }
}

/**
 * Handler para banir usuário
 */
async function handleUserBan(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('user_modal_ban')
        .setTitle('🔒 Banir Usuário');

    const userInput = new TextInputBuilder()
        .setCustomId('user_to_ban')
        .setLabel('Usuário para banir')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('nome_do_usuario')
        .setRequired(true)
        .setMaxLength(50);

    const reasonInput = new TextInputBuilder()
        .setCustomId('ban_reason')
        .setLabel('Motivo do banimento')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Motivo para banir este usuário...')
        .setRequired(true)
        .setMaxLength(200);

    const row1 = new ActionRowBuilder().addComponents(userInput);
    const row2 = new ActionRowBuilder().addComponents(reasonInput);

    modal.addComponents(row1, row2);
    await interaction.showModal(modal);
}

/**
 * Handler para desbanir usuário
 */
async function handleUserUnban(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('user_modal_unban')
        .setTitle('🔓 Desbanir Usuário');

    const userInput = new TextInputBuilder()
        .setCustomId('user_to_unban')
        .setLabel('Usuário para desbanir')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('nome_do_usuario')
        .setRequired(true)
        .setMaxLength(50);

    const row = new ActionRowBuilder().addComponents(userInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
}

/**
 * Handler para resetar HWID
 */
async function handleUserResetHwid(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('user_modal_reset_hwid')
        .setTitle('⚙️ Resetar HWID');

    const userInput = new TextInputBuilder()
        .setCustomId('user_to_reset')
        .setLabel('Usuário para resetar HWID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('nome_do_usuario')
        .setRequired(true)
        .setMaxLength(50);

    const row = new ActionRowBuilder().addComponents(userInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
}

/**
 * Handler para verificar usuário
 */
async function handleUserVerify(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('user_modal_verify')
        .setTitle('🔍 Verificar Usuário');

    const userInput = new TextInputBuilder()
        .setCustomId('user_to_verify')
        .setLabel('Usuário para verificar')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('nome_do_usuario')
        .setRequired(true)
        .setMaxLength(50);

    const row = new ActionRowBuilder().addComponents(userInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
}

/**
 * Handler para extender usuário
 */
async function handleUserExtend(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('user_modal_extend')
        .setTitle('⏰ Extender Usuário');

    const userInput = new TextInputBuilder()
        .setCustomId('user_to_extend')
        .setLabel('Usuário para extender')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('nome_do_usuario')
        .setRequired(true)
        .setMaxLength(50);

    const timeInput = new TextInputBuilder()
        .setCustomId('extend_time')
        .setLabel('Tempo a adicionar (em dias)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('30')
        .setRequired(true)
        .setMaxLength(10);

    const row1 = new ActionRowBuilder().addComponents(userInput);
    const row2 = new ActionRowBuilder().addComponents(timeInput);

    modal.addComponents(row1, row2);
    await interaction.showModal(modal);
}

/**
 * Handler para extender todos usuários
 */
async function handleUserExtendAll(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('user_modal_extend_all')
        .setTitle('🌐 Extender Todos Usuários');

    const timeInput = new TextInputBuilder()
        .setCustomId('extend_time_all')
        .setLabel('Tempo a adicionar (em dias)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('30')
        .setRequired(true)
        .setMaxLength(10);

    const confirmInput = new TextInputBuilder()
        .setCustomId('extend_confirm')
        .setLabel('Digite "CONFIRMAR" para extender todos')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('CONFIRMAR')
        .setRequired(true)
        .setMaxLength(15);

    const row1 = new ActionRowBuilder().addComponents(timeInput);
    const row2 = new ActionRowBuilder().addComponents(confirmInput);

    modal.addComponents(row1, row2);
    await interaction.showModal(modal);
}

/**
 * Handler para modais de usuários
 */
async function handleUserModals(interaction, client) {
    const action = interaction.customId.split('_')[2]; // ban, unban, reset, verify, extend
    
    await interaction.deferReply({ flags: ['Ephemeral'] });

    const sellerKey = process.env.KEYAUTH_SELLER_KEY;
    if (!sellerKey) {
        return await interaction.editReply({
            content: '❌ Configuração do servidor incorreta. KEYAUTH_SELLER_KEY não encontrada.'
        });
    }

    try {
        switch (action) {
            case 'ban':
                await handleUserBanModal(interaction, sellerKey);
                break;
            case 'unban':
                await handleUserUnbanModal(interaction, sellerKey);
                break;
            case 'reset':
                await handleUserResetHwidModal(interaction, sellerKey);
                break;
            case 'verify':
                await handleUserVerifyModal(interaction, sellerKey);
                break;
            case 'extend':
                if (interaction.customId === 'user_modal_extend') {
                    await handleUserExtendModal(interaction, sellerKey);
                } else if (interaction.customId === 'user_modal_extend_all') {
                    await handleUserExtendAllModal(interaction, sellerKey);
                }
                break;
            default:
                await interaction.editReply({
                    content: '❌ Ação não reconhecida.'
                });
        }
    } catch (error) {
        console.error('Erro no modal de usuário:', error);
        await interaction.editReply({
            content: '❌ Erro interno. Tente novamente.'
        });
    }
}

/**
 * Modal para banir usuário
 */
async function handleUserBanModal(interaction, sellerKey) {
    const userToBan = interaction.fields.getTextInputValue('user_to_ban').trim();
    const reason = interaction.fields.getTextInputValue('ban_reason').trim();

    // Fazer requisição para API
    const apiUrl = `https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=banuser&user=${encodeURIComponent(userToBan)}&reason=${encodeURIComponent(reason)}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const result = await response.text();
        console.log('Resultado do banimento de usuário:', result);

        // Verificar se foi sucesso
        if (result.includes('success') || result.includes('Success')) {
            await interaction.editReply({
                content: `✅ **Usuário banido com sucesso!**\n\n**Usuário:** \`${userToBan}\`\n**Motivo:** ${reason}\n\n🔒 O usuário foi banido do sistema.`
            });
        } else {
            await interaction.editReply({
                content: `❌ **Erro ao banir usuário:**\n\`${result}\``
            });
        }

    } catch (error) {
        console.error('Erro na API de banimento de usuário:', error);
        await interaction.editReply({
            content: '❌ Erro ao comunicar com a API. Tente novamente.'
        });
    }
}

/**
 * Modal para desbanir usuário
 */
async function handleUserUnbanModal(interaction, sellerKey) {
    const userToUnban = interaction.fields.getTextInputValue('user_to_unban').trim();

    // Fazer requisição para API
    const apiUrl = `https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=unbanuser&user=${encodeURIComponent(userToUnban)}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const result = await response.text();
        console.log('Resultado do desbanimento de usuário:', result);

        // Verificar se foi sucesso
        if (result.includes('success') || result.includes('Success')) {
            await interaction.editReply({
                content: `✅ **Usuário desbanido com sucesso!**\n\n**Usuário:** \`${userToUnban}\`\n\n🔓 O usuário foi desbanido do sistema.`
            });
        } else {
            await interaction.editReply({
                content: `❌ **Erro ao desbanir usuário:**\n\`${result}\``
            });
        }

    } catch (error) {
        console.error('Erro na API de desbanimento de usuário:', error);
        await interaction.editReply({
            content: '❌ Erro ao comunicar com a API. Tente novamente.'
        });
    }
}

/**
 * Modal para resetar HWID
 */
async function handleUserResetHwidModal(interaction, sellerKey) {
    const userToReset = interaction.fields.getTextInputValue('user_to_reset').trim();

    // Fazer requisição para API
    const apiUrl = `https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=resetuser&user=${encodeURIComponent(userToReset)}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const result = await response.text();
        console.log('Resultado do reset HWID:', result);

        // Verificar se foi sucesso
        if (result.includes('success') || result.includes('Success')) {
            await interaction.editReply({
                content: `✅ **HWID resetado com sucesso!**\n\n**Usuário:** \`${userToReset}\`\n\n⚙️ O HWID do usuário foi resetado.`
            });
        } else {
            await interaction.editReply({
                content: `❌ **Erro ao resetar HWID:**\n\`${result}\``
            });
        }

    } catch (error) {
        console.error('Erro na API de reset HWID:', error);
        await interaction.editReply({
            content: '❌ Erro ao comunicar com a API. Tente novamente.'
        });
    }
}

/**
 * Modal para verificar usuário
 */
async function handleUserVerifyModal(interaction, sellerKey) {
    const userToVerify = interaction.fields.getTextInputValue('user_to_verify').trim();

    // Fazer requisição para API
    const apiUrl = `https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=verifyuser&user=${encodeURIComponent(userToVerify)}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const result = await response.text();
        console.log('Resultado da verificação de usuário:', result);

        // Verificar se foi sucesso
        if (result.includes('success') || result.includes('Success')) {
            await interaction.editReply({
                content: `✅ **Usuário encontrado!**\n\n**Usuário:** \`${userToVerify}\`\n\n🔍 O usuário existe no sistema.`
            });
        } else {
            await interaction.editReply({
                content: `❌ **Usuário não encontrado!**\n\n**Usuário:** \`${userToVerify}\`\n\n🔍 O usuário não existe no sistema.`
            });
        }

    } catch (error) {
        console.error('Erro na API de verificação de usuário:', error);
        await interaction.editReply({
            content: '❌ Erro ao comunicar com a API. Tente novamente.'
        });
    }
}

/**
 * Modal para extender usuário
 */
async function handleUserExtendModal(interaction, sellerKey) {
    const userToExtend = interaction.fields.getTextInputValue('user_to_extend').trim();
    const extendTime = parseInt(interaction.fields.getTextInputValue('extend_time')) || 0;

    if (extendTime <= 0) {
        return await interaction.editReply({
            content: '❌ Tempo inválido! Digite um número válido de dias.'
        });
    }

    // Converter dias para segundos
    const expiry = extendTime * 86400; // 1 dia = 86400 segundos

    // Fazer requisição para API
    const apiUrl = `https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=extend&user=${encodeURIComponent(userToExtend)}&sub=&expiry=${expiry}&activeOnly=true`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const result = await response.text();
        console.log('Resultado da extensão de usuário:', result);

        // Verificar se foi sucesso
        if (result.includes('success') || result.includes('Success')) {
            await interaction.editReply({
                content: `✅ **Usuário extendido com sucesso!**\n\n**Usuário:** \`${userToExtend}\`\n**Tempo adicionado:** ${extendTime} dias\n\n⏰ A assinatura do usuário foi extendida.`
            });
        } else {
            await interaction.editReply({
                content: `❌ **Erro ao extender usuário:**\n\`${result}\``
            });
        }

    } catch (error) {
        console.error('Erro na API de extensão de usuário:', error);
        await interaction.editReply({
            content: '❌ Erro ao comunicar com a API. Tente novamente.'
        });
    }
}

/**
 * Modal para extender todos usuários
 */
async function handleUserExtendAllModal(interaction, sellerKey) {
    const extendTime = parseInt(interaction.fields.getTextInputValue('extend_time_all')) || 0;
    const confirmation = interaction.fields.getTextInputValue('extend_confirm').trim().toUpperCase();

    if (confirmation !== 'CONFIRMAR') {
        return await interaction.editReply({
            content: '❌ Confirmação incorreta. Digite "CONFIRMAR" para extender todos os usuários.'
        });
    }

    if (extendTime <= 0) {
        return await interaction.editReply({
            content: '❌ Tempo inválido! Digite um número válido de dias.'
        });
    }

    // Converter dias para segundos
    const expiry = extendTime * 86400; // 1 dia = 86400 segundos

    // Fazer requisição para API (user vazio para aplicar a todos)
    const apiUrl = `https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=extend&user=&sub=&expiry=${expiry}&activeOnly=true`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const result = await response.text();
        console.log('Resultado da extensão de todos usuários:', result);

        // Verificar se foi sucesso
        if (result.includes('success') || result.includes('Success')) {
            await interaction.editReply({
                content: `✅ **Todos os usuários foram extendidos!**\n\n**Tempo adicionado:** ${extendTime} dias\n**Aplicado a:** Todos usuários ativos\n\n🌐 Todas as assinaturas ativas foram extendidas.`
            });
        } else {
            await interaction.editReply({
                content: `❌ **Erro ao extender todos usuários:**\n\`${result}\``
            });
        }

    } catch (error) {
        console.error('Erro na API de extensão de todos usuários:', error);
        await interaction.editReply({
            content: '❌ Erro ao comunicar com a API. Tente novamente.'
        });
    }
}
