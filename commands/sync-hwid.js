const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync-hwid')
        .setDescription('🔄 Sincroniza o sistema de HWID (editar ou reenviar)')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID do sistema de HWID')
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
        const hwidId = interaction.options.getString('id');
        const action = interaction.options.getString('action');
        
        try {
            // Verificar se o sistema existe
            const hwid = database.getHwid(hwidId);
            if (!hwid) {
                return await interaction.reply({
                    content: '❌ Sistema de HWID não encontrado!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Construir a embed
            const embed = new EmbedBuilder()
                .setTitle(hwid.title || '⚙️ Scarlet ® - HWID System')
                .setDescription(hwid.description || 'Clique no botão abaixo para solicitar reset do seu HWID.')
                .setColor(hwid.color || '#ff6b6b')
                .setFooter({ text: `Sistema: ${hwidId}` })
                .setTimestamp();

            if (hwid.thumbnail) {
                embed.setThumbnail(hwid.thumbnail);
            }

            if (hwid.image) {
                embed.setImage(hwid.image);
            }

            // Construir o botão
            const button = new ButtonBuilder()
                .setCustomId(`hwid_reset_${hwidId}`)
                .setLabel(hwid.buttonText || '🔄 Reset HWID')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(button);

            if (action === 'edit') {
                // Tentar editar a mensagem existente
                try {
                    const channel = await interaction.client.channels.fetch(hwid.channelId);
                    const message = await channel.messages.fetch(hwid.messageId);
                    
                    await message.edit({
                        embeds: [embed],
                        components: [row]
                    });

                    await interaction.reply({
                        content: `✅ Sistema de HWID \`${hwidId}\` editado com sucesso!`,
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
                database.updateHwid(hwidId, {
                    messageId: newMessage.id,
                    channelId: interaction.channel.id
                });

                console.log(`✅ Sistema de HWID reenviado: ${hwidId}`);
            }

        } catch (error) {
            console.error('Erro ao sincronizar sistema de HWID:', error);
            await interaction.reply({
                content: '❌ Erro ao sincronizar o sistema de HWID!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
