const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-painel')
        .setDescription('Criar um novo painel com ID único no canal atual')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID único para o painel (ex: ticket-support, verificacao, etc)')
                .setRequired(true)
                .setMaxLength(50))
        .addStringOption(option =>
            option.setName('opcoes')
                .setDescription('Opções separadas por vírgula (ex: Suporte,Dúvidas,Reclamações,Outro)')
                .setRequired(false)
                .setMaxLength(500)),

    async execute(interaction) {
        const panelId = interaction.options.getString('id').toLowerCase().trim();
        const opcoes = interaction.options.getString('opcoes');
        const channel = interaction.channel;

        // Verificar se é admin
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Apenas administradores podem criar painéis.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Validar ID do painel
        if (!/^[a-z0-9-_]+$/.test(panelId)) {
            return interaction.reply({
                content: '❌ ID do painel deve conter apenas letras minúsculas, números, hífens e underscores.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Verificar se painel já existe
        const existingPanel = database.getPanel(panelId);
        if (existingPanel) {
            return interaction.reply({
                content: `❌ Já existe um painel com o ID \`${panelId}\`. Use um ID diferente ou delete o painel existente.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Processar opções se fornecidas
            let selectOptions = [];
            if (opcoes) {
                const opcoesList = opcoes.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
                
                if (opcoesList.length > 25) {
                    return interaction.editReply({
                        content: '❌ Máximo de 25 opções permitidas no select menu.'
                    });
                }

                selectOptions = opcoesList.map((opcao, index) => ({
                    label: opcao,
                    value: `${panelId}_option_${index}`,
                    description: `Selecionar ${opcao}`
                }));
            }

            // Criar embed padrão
            const embed = new EmbedBuilder()
                .setTitle('Painel Padrão')
                .setDescription('Descrição do painel')
                .setColor('#3498db')
                .setTimestamp();

            // Criar componentes se há opções
            const components = [];
            if (selectOptions.length > 0) {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`${panelId}_select`)
                    .setPlaceholder('Selecione uma opção...')
                    .addOptions(selectOptions);

                const row = new ActionRowBuilder().addComponents(selectMenu);
                components.push(row);
            }

            // Enviar painel no canal
            const messagePayload = { embeds: [embed] };
            if (components.length > 0) {
                messagePayload.components = components;
            }

            const sentMessage = await channel.send(messagePayload);

            // Salvar no database com as opções
            const panel = database.createPanel(panelId, channel.id, sentMessage.id);
            if (selectOptions.length > 0) {
                database.updatePanel(panelId, { 
                    selectOptions: selectOptions,
                    hasSelectMenu: true 
                });
            }

            // Confirmar criação
            const successEmbed = new EmbedBuilder()
                .setColor('#27ae60')
                .setTitle('✅ Painel Criado')
                .setDescription(`Painel \`${panelId}\` foi criado com sucesso!`)
                .addFields(
                    { name: 'ID do Painel', value: `\`${panelId}\``, inline: true },
                    { name: 'Canal', value: `${channel}`, inline: true },
                    { name: 'Message ID', value: `\`${sentMessage.id}\``, inline: true }
                )
                .setFooter({ text: 'Use /config-painel para personalizar' })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Erro ao criar painel:', error);
            await interaction.editReply({
                content: '❌ Erro ao criar o painel. Verifique se tenho permissão para enviar mensagens neste canal.'
            });
        }
    },
};
