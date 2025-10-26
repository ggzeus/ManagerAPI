const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enable-arrange')
        .setDescription('Ativar/desativar sistema de reportes no canal atual')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const channelId = interaction.channel.id;
            
            // Verificar se já está habilitado
            const isEnabled = database.isArrangeEnabled(guildId, channelId);
            
            if (isEnabled) {
                // Desabilitar arrange
                database.setArrangeStatus(guildId, channelId, false);
                
                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🔴 Reportes Desabilitados')
                        .setDescription(`Sistema de reportes foi **desabilitado** em ${interaction.channel}`)
                        .addFields(
                            { name: '📢 Status', value: 'Desabilitado', inline: true },
                            { name: '📍 Canal', value: interaction.channel.toString(), inline: true }
                        )
                        .setColor('#ff0000')
                        .setTimestamp()
                    ],
                    flags: MessageFlags.Ephemeral
                });
            } else {
                // Habilitar arrange
                database.setArrangeStatus(guildId, channelId, true);
                
                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🟢 Reportes Habilitados')
                        .setDescription(`Sistema de reportes foi **habilitado** em ${interaction.channel}`)
                        .addFields(
                            { name: '📢 Status', value: 'Habilitado', inline: true },
                            { name: '📍 Canal', value: interaction.channel.toString(), inline: true },
                            { name: '⚡ Funcionalidades', value: '• Reações automáticas ✅ ❌\n• Criação de tópicos\n• Sistema de confirmação', inline: false }
                        )
                        .setColor('#00ff00')
                        .setTimestamp()
                        .setFooter({ text: 'Agora as mensagens neste canal receberão reações e tópicos automáticos' })
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
            
        } catch (error) {
            console.error('Erro no comando enable-arrange:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('❌ Erro')
                    .setDescription('Ocorreu um erro ao configurar o sistema de reportes.')
                    .setColor('#ff0000')
                ],
                flags: MessageFlags.Ephemeral
            });
        }
    },
};
