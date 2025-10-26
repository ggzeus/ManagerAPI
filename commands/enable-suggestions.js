const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enable-suggestions')
        .setDescription('Ativar/desativar sistema de sugestões no canal atual')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const channelId = interaction.channel.id;
            
            // Verificar se já está habilitado
            const isEnabled = database.isSuggestionEnabled(guildId, channelId);
            
            if (isEnabled) {
                // Desabilitar sugestões
                database.setSuggestionStatus(guildId, channelId, false);
                
                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🔴 Sugestões Desabilitadas')
                        .setDescription(`Sistema de sugestões foi **desabilitado** em ${interaction.channel}`)
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
                // Habilitar sugestões
                database.setSuggestionStatus(guildId, channelId, true);
                
                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🟢 Sugestões Habilitadas')
                        .setDescription(`Sistema de sugestões foi **habilitado** em ${interaction.channel}`)
                        .addFields(
                            { name: '📢 Status', value: 'Habilitado', inline: true },
                            { name: '📍 Canal', value: interaction.channel.toString(), inline: true },
                            { name: '⚡ Funcionalidades', value: '• Reações automáticas ✅ ❌\n• Criação de tópicos\n• Sistema de votação', inline: false }
                        )
                        .setColor('#00ff00')
                        .setTimestamp()
                        .setFooter({ text: 'Agora as mensagens neste canal receberão reações automáticas' })
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
            
        } catch (error) {
            console.error('Erro no comando enable-suggestions:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('❌ Erro')
                    .setDescription('Ocorreu um erro ao configurar o sistema de sugestões.')
                    .setColor('#ff0000')
                ],
                flags: MessageFlags.Ephemeral
            });
        }
    },
};
