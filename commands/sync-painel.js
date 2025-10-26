const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync-painel')
        .setDescription('Sincronizar painel - tenta editar, se falhar apaga e reenvia')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID do painel para sincronizar')
                .setRequired(true)),

    async execute(interaction) {
        const panelId = interaction.options.getString('id').toLowerCase().trim();

        // Verificar se é admin
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Apenas administradores podem sincronizar painéis.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Verificar se painel existe
        const panel = database.getPanel(panelId);
        if (!panel) {
            return interaction.reply({
                content: `❌ Painel com ID \`${panelId}\` não encontrado.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Construir embed e componentes baseados na configuração do painel
            const embed = this.buildEmbedFromPanel(panel);
            const components = this.buildComponentsFromPanel(panel);

            // Tentar obter o canal
            const channel = await interaction.client.channels.fetch(panel.channelId).catch(() => null);
            if (!channel) {
                return interaction.editReply({
                    content: `❌ Canal do painel não encontrado. O painel pode estar órfão.`
                });
            }

            let syncResult = {
                method: '',
                success: false,
                newMessageId: panel.messageId
            };

            const messagePayload = { embeds: [embed] };
            if (components.length > 0) {
                messagePayload.components = components;
            }

            // Tentar editar mensagem existente
            if (panel.messageId) {
                try {
                    const existingMessage = await channel.messages.fetch(panel.messageId).catch(() => null);
                    
                    if (existingMessage) {
                        await existingMessage.edit(messagePayload);
                        syncResult = {
                            method: 'edit',
                            success: true,
                            newMessageId: panel.messageId
                        };
                    } else {
                        throw new Error('Mensagem não encontrada');
                    }
                } catch (editError) {
                    console.log('Falha ao editar, tentando reenviar:', editError.message);
                    
                    // Se falhou em editar, apagar e reenviar
                    if (panel.messageId) {
                        try {
                            const messageToDelete = await channel.messages.fetch(panel.messageId).catch(() => null);
                            if (messageToDelete) {
                                await messageToDelete.delete();
                            }
                        } catch (deleteError) {
                            console.log('Erro ao deletar mensagem:', deleteError.message);
                        }
                    }
                    
                    // Reenviar
                    const newMessage = await channel.send(messagePayload);
                    syncResult = {
                        method: 'delete_and_resend',
                        success: true,
                        newMessageId: newMessage.id
                    };
                }
            } else {
                // Não há messageId, enviar nova mensagem
                const newMessage = await channel.send(messagePayload);
                syncResult = {
                    method: 'new_send',
                    success: true,
                    newMessageId: newMessage.id
                };
            }

            // Atualizar messageId no database se necessário
            if (syncResult.newMessageId !== panel.messageId) {
                database.updatePanelMessage(panelId, syncResult.newMessageId);
            }

            // Resposta de sucesso
            const methodTexts = {
                'edit': '✏️ Editado com sucesso',
                'delete_and_resend': '🔄 Apagado e reenviado',
                'new_send': '📤 Enviado nova mensagem'
            };

            const successEmbed = new EmbedBuilder()
                .setColor('#27ae60')
                .setTitle('✅ Painel Sincronizado')
                .setDescription(`Painel \`${panelId}\` foi sincronizado!`)
                .addFields(
                    { name: 'Método', value: methodTexts[syncResult.method], inline: true },
                    { name: 'Canal', value: `${channel}`, inline: true },
                    { name: 'Message ID', value: `\`${syncResult.newMessageId}\``, inline: true }
                )
                .setFooter({ text: `Sincronizado em ${new Date().toLocaleString('pt-BR')}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Erro ao sincronizar painel:', error);
            await interaction.editReply({
                content: `❌ Erro ao sincronizar o painel: ${error.message}`
            });
        }
    },

    buildEmbedFromPanel(panel) {
        const embed = new EmbedBuilder();

        // Configurações básicas
        if (panel.title) embed.setTitle(panel.title);
        if (panel.description) embed.setDescription(panel.description);
        if (panel.color) embed.setColor(panel.color);

        // Imagens
        if (panel.banner) embed.setImage(panel.banner);
        if (panel.thumbnail) embed.setThumbnail(panel.thumbnail);

        // Autor
        if (panel.author && panel.author.name) {
            const authorConfig = { name: panel.author.name };
            if (panel.author.iconURL) authorConfig.iconURL = panel.author.iconURL;
            embed.setAuthor(authorConfig);
        }

        // Fields (se houver)
        if (panel.fields && panel.fields.length > 0) {
            embed.addFields(...panel.fields);
        }

        // Footer
        if (panel.footer) {
            embed.setFooter({ text: panel.footer });
        }

        // Timestamp
        if (panel.timestamp) {
            embed.setTimestamp();
        }

        return embed;
    },

    buildComponentsFromPanel(panel) {
        const components = [];

        // Select Menu se houver opções
        if (panel.hasSelectMenu && panel.selectOptions && panel.selectOptions.length > 0) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`${panel.id}_select`)
                .setPlaceholder('Selecione uma opção...')
                .addOptions(panel.selectOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            components.push(row);
        }

        return components;
    }
};
