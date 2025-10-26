const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config-fix')
        .setDescription('Configurar painel de fix do canal atual')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const channelId = interaction.channel.id;
            
            // Verificar se existe painel neste canal
            const panel = database.getFixPanel(guildId, channelId);
            
            if (!panel) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ Painel não encontrado')
                        .setDescription('Não existe um painel de fix neste canal. Use `/set-fix` primeiro.')
                        .setColor('#ff0000')
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Criar embed de configuração
            const configEmbed = new EmbedBuilder()
                .setTitle('⚙️ Configuração do Painel de Fix')
                .setDescription('Use os botões abaixo para configurar o painel')
                .addFields(
                    { name: '📋 Título Atual', value: panel.title, inline: true },
                    { name: '📝 Descrição', value: panel.description.substring(0, 100) + (panel.description.length > 100 ? '...' : ''), inline: true },
                    { name: '🎨 Cor', value: panel.color, inline: true },
                    { name: '📊 Categorias', value: Object.keys(panel.categories).length.toString() || '0', inline: true },
                    { name: '📍 Canal', value: `<#${channelId}>`, inline: true },
                    { name: '🕒 Atualizado', value: `<t:${Math.floor(new Date(panel.updatedAt).getTime() / 1000)}:R>`, inline: true }
                )
                .setColor(panel.color)
                .setTimestamp();
            
            // Criar botões de configuração
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`fix_edit_title_${channelId}`)
                        .setLabel('📝 Editar Título')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`fix_edit_description_${channelId}`)
                        .setLabel('📋 Editar Descrição')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`fix_edit_color_${channelId}`)
                        .setLabel('🎨 Editar Cor')
                        .setStyle(ButtonStyle.Primary)
                );
            
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`fix_manage_categories_${channelId}`)
                        .setLabel('📂 Gerenciar Categorias')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`fix_preview_${channelId}`)
                        .setLabel('👁️ Visualizar Painel')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`fix_update_panel_${channelId}`)
                        .setLabel('🔄 Atualizar Painel')
                        .setStyle(ButtonStyle.Danger)
                );
            
            await interaction.reply({
                embeds: [configEmbed],
                components: [row1, row2],
                flags: MessageFlags.Ephemeral
            });
            
        } catch (error) {
            console.error('Erro no comando config-fix:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ Erro')
                        .setDescription('Ocorreu um erro ao abrir as configurações.')
                        .setColor('#ff0000')
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    },
};
