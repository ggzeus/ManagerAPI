const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-hwid')
        .setDescription('⚙️ Cria um sistema de reset HWID')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID único para o sistema de HWID')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const hwidId = interaction.options.getString('id');
        
        try {
            // Verificar se já existe um sistema com este ID
            const existingHwid = database.getHwid(hwidId);
            if (existingHwid) {
                return await interaction.reply({
                    content: '❌ Já existe um sistema de HWID com este ID!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Embed padrão
            const embed = new EmbedBuilder()
                .setTitle('⚙️ Scarlet ® - HWID System')
                .setDescription('Clique no botão abaixo para solicitar reset do seu HWID.')
                .setColor('#ff6b6b')
                .setFooter({ text: `Sistema: ${hwidId}` })
                .setTimestamp();

            // Botão de reset HWID
            const button = new ButtonBuilder()
                .setCustomId(`hwid_reset_${hwidId}`)
                .setLabel('🔄 Reset HWID')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(button);

            // Enviar a mensagem
            const message = await interaction.reply({
                embeds: [embed],
                components: [row],
                fetchReply: true
            });

            // Salvar no database
            const hwidData = {
                id: hwidId,
                messageId: message.id,
                channelId: interaction.channel.id,
                guildId: interaction.guild.id,
                title: '⚙️ Scarlet ® - HWID System',
                description: 'Clique no botão abaixo para solicitar reset do seu HWID.',
                color: '#ff6b6b',
                createdBy: interaction.user.id,
                createdAt: new Date().toISOString()
            };

            database.createHwid(hwidData);

            console.log(`✅ Sistema de HWID criado: ${hwidId}`);

        } catch (error) {
            console.error('Erro ao criar sistema de HWID:', error);
            await interaction.reply({
                content: '❌ Erro ao criar o sistema de HWID!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
