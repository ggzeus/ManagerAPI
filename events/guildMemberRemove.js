const { Events, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        try {
            const guildId = member.guild.id;
            
            // Verificar se o log de saída está ativado para o servidor
            const leftLogData = database.getLeftLogStatus(guildId);
            
            if (leftLogData && leftLogData.enabled && leftLogData.channelId) {
                const logChannel = member.guild.channels.cache.get(leftLogData.channelId);
                
                if (logChannel) {
                    // Criar embed de saída
                    const leftEmbed = new EmbedBuilder()
                        .setTitle('🔴 Usuário saiu do servidor')
                        .setColor('#FF0000')
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                        .addFields(
                            { name: '👤 Usuário', value: `${member.user}`, inline: true },
                            { name: '🆔 ID', value: member.user.id, inline: true },
                            { name: '📅 Conta criada', value: `<t:${Math.floor(member.user.createdAt.getTime() / 1000)}:R>`, inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() });

                    // Enviar embed no canal de log
                    await logChannel.send({ embeds: [leftEmbed] });
                }
            }

            // Remover do database se existir
            const userData = database.getUser(member.id);
            if (userData) {
                database.deleteUser(member.id);
                console.log(`Usuário ${member.user.tag} removido do database.`);
            }
        } catch (error) {
            console.error('Erro no evento guildMemberRemove:', error);
        }
    },
};
