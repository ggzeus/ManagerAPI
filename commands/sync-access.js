const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync-access')
        .setDescription('🔄 Sincroniza o sistema de acesso (editar ou reenviar)')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID do sistema de acesso')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Ação a ser executada')
                .setRequired(true)
                .addChoices(
                    { name: 'Editar mensagem existente', value: 'edit' },
                    { name: 'Reenviar mensagem', value: 'resend' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const accessId = interaction.options.getString('id');
        const action = interaction.options.getString('action');
        
        try {
            // Verificar se o sistema existe
            const access = database.getAccess(accessId);
            if (!access) {
                return await interaction.reply({
                    content: '❌ Sistema de acesso não encontrado!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Construir a embed
            const embed = new EmbedBuilder()
                .setTitle(access.title || '🔓 Sistema de Verificação')
                .setDescription(access.description || 'Clique no botão abaixo para verificar sua licença e obter acesso ao servidor.')
                .setColor(access.color || '#00ff00')
                .setFooter({ text: `Sistema: ${accessId}` })
                .setTimestamp();

            if (access.thumbnail) {
                embed.setThumbnail(access.thumbnail);
            }

            if (access.image) {
                embed.setImage(access.image);
            }

            // Construir o botão
            const button = new ButtonBuilder()
                .setCustomId(`access_verify_${accessId}`)
                .setLabel(access.buttonText || '🔑 Verificar Licença')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder()
                .addComponents(button);

            if (action === 'edit') {
                // Tentar editar a mensagem existente
                try {
                    const channel = await interaction.client.channels.fetch(access.channelId);
                    const message = await channel.messages.fetch(access.messageId);
                    
                    await message.edit({
                        embeds: [embed],
                        components: [row]
                    });

                    await interaction.reply({
                        content: `✅ Sistema de acesso \`${accessId}\` editado com sucesso!`,
                        flags: MessageFlags.Ephemeral
                    });

                } catch (error) {
                    console.error('Erro ao editar mensagem:', error);
                    await interaction.reply({
                        content: '❌ Não foi possível editar a mensagem. Tente reenviar.',
                        flags: MessageFlags.Ephemeral
                    });
                }

            } else if (action === 'resend') {
                // Reenviar a mensagem
                const newMessage = await interaction.reply({
                    embeds: [embed],
                    components: [row],
                    fetchReply: true
                });

                // Atualizar os IDs no database
                database.updateAccess(accessId, {
                    messageId: newMessage.id,
                    channelId: interaction.channel.id
                });

                console.log(`✅ Sistema de acesso reenviado: ${accessId}`);
            }

        } catch (error) {
            console.error('Erro ao sincronizar sistema de acesso:', error);
            await interaction.reply({
                content: '❌ Erro ao sincronizar o sistema de acesso!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
