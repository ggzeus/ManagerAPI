const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config-download')
        .setDescription('Configurar painel de download do canal atual')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const channelId = interaction.channel.id;
            
            // Verificar se existe configuração de download neste canal
            const config = database.getDownloadConfig(guildId, channelId);
            
            if (!config) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ Painel não encontrado')
                        .setDescription('Não existe um painel de download neste canal. Use `/set-download` primeiro.')
                        .setColor('#ff0000')
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Criar modal de configuração
            const modal = new ModalBuilder()
                .setCustomId(`config_download_${channelId}`)
                .setTitle('⚙️ Configurar Download');
            
            // Campo de título
            const titleInput = new TextInputBuilder()
                .setCustomId('download_title')
                .setLabel('Título do Painel')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('📥 Download Menu')
                .setValue(config.title || '📥 Download Menu')
                .setRequired(true)
                .setMaxLength(100);
            
            // Campo de descrição
            const descriptionInput = new TextInputBuilder()
                .setCustomId('download_description')
                .setLabel('Descrição do Painel')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Clique no botão abaixo para baixar o menu')
                .setValue(config.description || 'Clique no botão abaixo para baixar o menu')
                .setRequired(true)
                .setMaxLength(500);
            
            // Campo de cor (hex)
            const colorInput = new TextInputBuilder()
                .setCustomId('download_color')
                .setLabel('Cor do Embed (hex)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('#00ff00')
                .setValue(config.color || '#00ff00')
                .setRequired(true)
                .setMaxLength(7);
            
            // Campo de texto do botão
            const buttonTextInput = new TextInputBuilder()
                .setCustomId('download_button_text')
                .setLabel('Texto do Botão')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('📥 Baixar Menu')
                .setValue(config.buttonText || '📥 Baixar Menu')
                .setRequired(true)
                .setMaxLength(50);
            
            // Campo para URL do arquivo
            const fileUrlInput = new TextInputBuilder()
                .setCustomId('download_file_url')
                .setLabel('URL do Arquivo (.rar/.zip)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://cdn.discordapp.com/attachments/...')
                .setValue(config.fileUrl || '')
                .setRequired(false)
                .setMaxLength(500);
            
            // Adicionar campos ao modal
            const titleRow = new ActionRowBuilder().addComponents(titleInput);
            const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);
            const colorRow = new ActionRowBuilder().addComponents(colorInput);
            const buttonRow = new ActionRowBuilder().addComponents(buttonTextInput);
            const fileRow = new ActionRowBuilder().addComponents(fileUrlInput);
            
            modal.addComponents(titleRow, descriptionRow, colorRow, buttonRow, fileRow);
            
            // Mostrar modal
            await interaction.showModal(modal);
            
        } catch (error) {
            console.error('Erro no comando config-download:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('❌ Erro')
                    .setDescription('Ocorreu um erro ao abrir as configurações.')
                    .setColor('#ff0000')
                ],
                flags: MessageFlags.Ephemeral
            });
        }
    },
};
