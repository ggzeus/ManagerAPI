const { Events, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
require('dotenv').config();

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        try {
            // ========== VERIFICAÇÃO CROSS-SERVER ==========
            try {
                const lojaGuildId = '1304874464378355842'; // LOJA_GUILD_ID
                const revendedorRoleId = '1381291608590258196'; // REVENDEDOR_ROLE_ID
                const verifiedRoleId = '1431641793488752812'; // VERIFIED_ROLE_ID
                
                // Buscar servidor da loja
                const lojaGuild = client.guilds.cache.get(lojaGuildId);
                
                if (lojaGuild) {
                    // Verificar se o usuário está no servidor da loja
                    const lojaMember = lojaGuild.members.cache.get(member.user.id);
                    
                    if (lojaMember && lojaMember.roles.cache.has(revendedorRoleId)) {
                        // Usuário tem cargo de revendedor na loja - liberar automaticamente
                        const verifiedRole = member.guild.roles.cache.get(verifiedRoleId);
                        
                        if (verifiedRole) {
                            await member.roles.add(verifiedRole);
                            console.log(`✅ ${member.user.tag} liberado automaticamente (revendedor na loja)`);
                            
                            // Log da liberação automática
                            const entryLogConfig = database.getEntryLogStatus(member.guild.id);
                            if (entryLogConfig && entryLogConfig.enabled) {
                                const logChannel = await client.channels.fetch(entryLogConfig.channelId);
                                if (logChannel) {
                                    const autoVerifyEmbed = new EmbedBuilder()
                                        .setTitle('✅ Verificação Automática')
                                        .setDescription(`${member.user.tag} foi liberado automaticamente por ter cargo de revendedor`)
                                        .addFields(
                                            { name: '👤 Usuário', value: `${member.user}`, inline: true },
                                            { name: '🏪 Status', value: 'Revendedor Verificado', inline: true },
                                            { name: '⚡ Ação', value: 'Liberação Automática', inline: true }
                                        )
                                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                                        .setColor('#FFD700')
                                        .setTimestamp();
                                    
                                    await logChannel.send({ embeds: [autoVerifyEmbed] });
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Erro na verificação cross-server:', error);
            }
            
            // ========== LOG DE ENTRADA NORMAL ==========
            // Verificar se logs de entrada estão ativados
            const entryLogConfig = database.getEntryLogStatus(member.guild.id);
            
            if (entryLogConfig && entryLogConfig.enabled) {
                try {
                    const logChannel = await client.channels.fetch(entryLogConfig.channelId);
                    
                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setTitle('🚪 Membro Entrou no Servidor')
                            .setDescription(`${member.user.tag} entrou no servidor`)
                            .addFields(
                                { name: '👤 Usuário', value: `${member.user} (${member.user.tag})`, inline: true },
                                { name: '🆔 ID de usuário', value: member.user.id, inline: true },
                                { name: '📅 Conta criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
                            )
                            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                            .setColor('#00ff00')
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [embed] });
                    }
                } catch (error) {
                    console.error('Erro ao enviar log de entrada:', error);
                }
            }
            
            console.log(`👋 ${member.user.tag} entrou no servidor ${member.guild.name}`);
            
        } catch (error) {
            console.error('Erro no evento guildMemberAdd:', error);
        }
    },
};
