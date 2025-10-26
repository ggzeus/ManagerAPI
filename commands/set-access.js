const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-access')
        .setDescription('💡 Cria um sistema de verificação de acesso com chaves')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID único para o sistema de acesso')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const accessId = interaction.options.getString('id');
        
        try {
            // Verificar se já existe um sistema com este ID
            const existingAccess = database.getAccess(accessId);
            if (existingAccess) {
                return await interaction.reply({
                    content: '❌ Já existe um sistema de acesso com este ID!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Embed padrão
            const embed = new EmbedBuilder()
                .setTitle('Scarlet ® - Access Manager')
                .setDescription('> Ultilize os botões abaixo para liberar acesso ao **servidor**.\n\n- **Liberar por Key:** Ultilize a key para liberar acesso ao servidor\n- **Liberar por Login:** Ultilize seu usuário e senha para liberar acesso ao servidor')
                .setColor('#00ff00')
                .setFooter({ text: `Sistema: ${accessId}` })
                .setTimestamp();

            // Botões de verificação
            const keyButton = new ButtonBuilder()
                .setCustomId(`access_verify_key_${accessId}`)
                .setLabel('🔑 Liberar por Key')
                .setStyle(ButtonStyle.Primary);

            const loginButton = new ButtonBuilder()
                .setCustomId(`access_verify_login_${accessId}`)
                .setLabel('👤 Liberar por Login')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder()
                .addComponents(keyButton, loginButton);

            // Enviar a mensagem
            const message = await interaction.reply({
                embeds: [embed],
                components: [row],
                fetchReply: true
            });

            // Salvar no database
            const accessData = {
                id: accessId,
                messageId: message.id,
                channelId: interaction.channel.id,
                guildId: interaction.guild.id,
                title: 'Scarlet ® - Access Manager',
                description: '> Ultilize os botões abaixo para liberar acesso ao **servidor**.\n\n- **Liberar por Key:** Ultilize a key para liberar acesso ao servidor\n- **Liberar por Login:** Ultilize seu usuário e senha para liberar acesso ao servidor',
                color: '#00ff00',
                createdBy: interaction.user.id,
                createdAt: new Date().toISOString()
            };

            database.createAccess(accessData);

            console.log(`✅ Sistema de acesso criado: ${accessId}`);

        } catch (error) {
            console.error('Erro ao criar sistema de acesso:', error);
            await interaction.reply({
                content: '❌ Erro ao criar o sistema de acesso!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
