const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database');

// Função helper para resposta segura
async function safeReply(interaction, content) {
    try {
        if (interaction.deferred) {
            return await interaction.editReply(content);
        } else if (!interaction.replied) {
            return await interaction.reply(content);
        }
    } catch (error) {
        console.error('Erro ao responder interação:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unverify')
        .setDescription('🔓 Remove a verificação de um usuário completamente')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuário para remover a verificação')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('Motivo da remoção da verificação')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const targetUser = interaction.options.getUser('usuario');
            const reason = interaction.options.getString('motivo') || 'Não especificado';
            const admin = interaction.user;
            // Verificar se o usuário tem acesso temporário ativo
            const hasTemporaryAccess = database.hasValidTemporaryAccess(targetUser.id);
            
            // Obter dados de acesso temporário diretamente
            let temporaryAccessData = null;
            if (hasTemporaryAccess) {
                const data = database.read();
                temporaryAccessData = data.temporaryAccess?.[targetUser.id] || null;
            }
            
            // Verificar se o usuário tem verificação antiga
            const userData = database.getUser(targetUser.id);
            const hasOldVerification = userData && userData.verified;

            // Se não tem nenhum tipo de verificação
            if (!hasTemporaryAccess && !hasOldVerification) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#f39c12')
                    .setTitle('⚠️ Usuário Não Verificado')
                    .setDescription(`${targetUser.tag} não possui nenhuma verificação ativa no sistema.`)
                    .setTimestamp();

                return await safeReply(interaction, { embeds: [errorEmbed] });
            }

            // Obter membro do servidor
            const guild = interaction.guild;
            const member = await guild.members.fetch(targetUser.id).catch(() => null);

            let removedRoles = [];
            let accessInfo = {};

            if (member) {
                // Definir roles de verificação
                const verifiedRoleId = '1431641793488752812'; // VERIFIED_ROLE_ID
                const clientRoleId = process.env.CLIENT_ROLE_ID;

                // Remover role de verificação
                if (verifiedRoleId && member.roles.cache.has(verifiedRoleId)) {
                    const role = guild.roles.cache.get(verifiedRoleId);
                    await member.roles.remove(verifiedRoleId);
                    removedRoles.push(role?.name || 'Verified');
                }

                // Remover role de cliente se existir
                if (clientRoleId && member.roles.cache.has(clientRoleId)) {
                    const role = guild.roles.cache.get(clientRoleId);
                    await member.roles.remove(clientRoleId);
                    removedRoles.push(role?.name || 'Client');
                }
            }

            // Cancelar timer de acesso se existir
            try {
                const { accessTimers } = require('../events/interactionCreate');
                if (accessTimers && accessTimers.has(targetUser.id)) {
                    clearTimeout(accessTimers.get(targetUser.id));
                    accessTimers.delete(targetUser.id);
                    console.log(`Timer de acesso cancelado para: ${targetUser.tag}`);
                }
            } catch (timerError) {
                console.log('Erro ao cancelar timer:', timerError.message);
            }

            // Coletar informações do acesso para logs
            if (hasTemporaryAccess && temporaryAccessData) {
                accessInfo = {
                    method: temporaryAccessData.method || 'key',
                    identifier: temporaryAccessData.identifier || temporaryAccessData.key || 'N/A',
                    expiresAt: temporaryAccessData.expiresAt,
                    duration: temporaryAccessData.duration
                };
            } else if (hasOldVerification) {
                accessInfo = {
                    method: 'legacy',
                    identifier: userData.licenseKey || 'N/A',
                    verifiedAt: userData.verifiedAt
                };
            }

            // Remover acesso temporário do banco
            if (hasTemporaryAccess) {
                database.removeTemporaryAccess(targetUser.id);
            }

            // Remover verificação antiga do banco se existir
            if (hasOldVerification) {
                // Adicionar à lista de usuários removidos para histórico
                try {
                    database.addRemovedUser(targetUser.id, {
                        userId: targetUser.id,
                        username: targetUser.tag,
                        licenseKey: userData.licenseKey,
                        verifiedAt: userData.verifiedAt,
                        removedBy: admin.id,
                        removedByTag: admin.tag,
                        reason: reason,
                        originalData: userData
                    });
                } catch (addError) {
                    console.log('Erro ao adicionar usuário removido:', addError.message);
                }
                
                database.deleteUser(targetUser.id);
            }

            // Criar embed de sucesso
            const successEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('🔓 Verificação Removida')
                .setDescription(`A verificação de ${targetUser.tag} foi removida completamente do sistema.`)
                .addFields(
                    { name: '👤 Usuário', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: '🛠️ Removido por', value: `${admin.tag}`, inline: true },
                    { name: '📝 Motivo', value: reason, inline: false }
                );

            // Adicionar informações específicas do tipo de acesso
            if (hasTemporaryAccess) {
                const expiryDate = accessInfo.expiresAt ? new Date(accessInfo.expiresAt) : null;
                successEmbed.addFields(
                    { name: '� Tipo de Acesso', value: 'Temporário', inline: true },
                    { name: '🔧 Método', value: accessInfo.method === 'login' ? 'Login' : 'Chave', inline: true },
                    { name: '🔑 Identificador', value: `||${accessInfo.identifier}||`, inline: false }
                );
                
                if (expiryDate) {
                    successEmbed.addFields(
                        { name: '⏰ Expiraria em', value: `<t:${Math.floor(expiryDate.getTime() / 1000)}:F>`, inline: true }
                    );
                }
            }

            if (hasOldVerification) {
                successEmbed.addFields(
                    { name: '� Tipo de Acesso', value: 'Verificação Legacy', inline: true },
                    { name: '🔑 Licença Anterior', value: `||${accessInfo.identifier}||`, inline: false }
                );
                
                if (accessInfo.verifiedAt) {
                    successEmbed.addFields(
                        { name: '📅 Verificado em', value: `<t:${Math.floor(new Date(accessInfo.verifiedAt).getTime() / 1000)}:F>`, inline: true }
                    );
                }
            }

            if (removedRoles.length > 0) {
                successEmbed.addFields(
                    { name: '🎭 Cargos Removidos', value: removedRoles.join(', '), inline: false }
                );
            }

            successEmbed
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ text: `Removido por ${admin.tag}` })
                .setTimestamp();

            // Log detalhado
            try {
                const Logger = require('../utils/logger');
                const logger = new Logger(interaction.client);
                await logger.log('warning', 'Verificação Removida', `Admin removeu verificação de usuário`, [
                    { name: 'Admin', value: `${admin.tag} (${admin.id})`, inline: true },
                    { name: 'Usuário', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Motivo', value: reason, inline: false },
                    { name: 'Tipo', value: hasTemporaryAccess ? 'Temporário' : 'Legacy', inline: true },
                    { name: 'Método', value: accessInfo.method || 'N/A', inline: true },
                    { name: 'Identificador', value: `||${accessInfo.identifier}||`, inline: false }
                ]);
            } catch (logError) {
                console.log('Erro ao fazer log:', logError.message);
            }

            console.log(`✅ Verificação removida para ${targetUser.tag} por ${admin.tag} - Motivo: ${reason}`);

            return await safeReply(interaction, { embeds: [successEmbed] });

        } catch (error) {
            console.error('Erro ao remover verificação:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Erro')
                .setDescription('Não foi possível remover a verificação completamente.')
                .addFields(
                    { name: 'Detalhes', value: error.message || 'Erro desconhecido' }
                )
                .setTimestamp();

            return await safeReply(interaction, { embeds: [errorEmbed] });
        }
    },
};
