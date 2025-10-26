const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config-painel')
        .setDescription('Configurar um painel existente por ID')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID do painel para configurar')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('Título do painel')
                .setRequired(false)
                .setMaxLength(256))
        .addStringOption(option =>
            option.setName('descricao')
                .setDescription('Descrição do painel')
                .setRequired(false)
                .setMaxLength(4096))
        .addStringOption(option =>
            option.setName('cor')
                .setDescription('Cor do painel em hex (ex: #ff0000 ou ff0000)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('rodape')
                .setDescription('Texto do rodapé')
                .setRequired(false)
                .setMaxLength(2048))
        .addStringOption(option =>
            option.setName('banner')
                .setDescription('URL da imagem de banner (topo)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('thumbnail')
                .setDescription('URL da imagem thumbnail (canto)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('autor')
                .setDescription('Nome do autor do painel')
                .setRequired(false)
                .setMaxLength(256))
        .addStringOption(option =>
            option.setName('autor-icone')
                .setDescription('URL do ícone do autor')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('timestamp')
                .setDescription('Mostrar timestamp no painel')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('opcoes-select')
                .setDescription('Opções do select menu separadas por vírgula (ex: Suporte,Dúvidas,Reclamações)')
                .setRequired(false)
                .setMaxLength(500)),

    async execute(interaction) {
        const panelId = interaction.options.getString('id').toLowerCase().trim();

        // Verificar se é admin
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Apenas administradores podem configurar painéis.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Verificar se painel existe
        const panel = database.getPanel(panelId);
        if (!panel) {
            return interaction.reply({
                content: `❌ Painel com ID \`${panelId}\` não encontrado. Use \`/create-painel\` primeiro.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Coletar configurações
            const config = {};
            
            if (interaction.options.getString('titulo')) {
                config.title = interaction.options.getString('titulo');
            }
            
            if (interaction.options.getString('descricao')) {
                config.description = interaction.options.getString('descricao');
            }
            
            if (interaction.options.getString('cor')) {
                let color = interaction.options.getString('cor');
                // Normalizar cor (adicionar # se necessário)
                if (!color.startsWith('#')) {
                    color = '#' + color;
                }
                // Validar formato hex
                if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                    return interaction.editReply({
                        content: '❌ Cor inválida. Use formato hex como #ff0000 ou ff0000.'
                    });
                }
                config.color = color;
            }
            
            if (interaction.options.getString('rodape')) {
                config.footer = interaction.options.getString('rodape');
            }
            
            if (interaction.options.getString('banner')) {
                const bannerUrl = interaction.options.getString('banner');
                if (!this.isValidUrl(bannerUrl)) {
                    return interaction.editReply({
                        content: '❌ URL do banner inválida.'
                    });
                }
                config.banner = bannerUrl;
            }
            
            if (interaction.options.getString('thumbnail')) {
                const thumbnailUrl = interaction.options.getString('thumbnail');
                if (!this.isValidUrl(thumbnailUrl)) {
                    return interaction.editReply({
                        content: '❌ URL do thumbnail inválida.'
                    });
                }
                config.thumbnail = thumbnailUrl;
            }
            
            if (interaction.options.getString('autor')) {
                config.author = {
                    name: interaction.options.getString('autor'),
                    iconURL: interaction.options.getString('autor-icone') || undefined
                };
            } else if (interaction.options.getString('autor-icone')) {
                const iconUrl = interaction.options.getString('autor-icone');
                if (!this.isValidUrl(iconUrl)) {
                    return interaction.editReply({
                        content: '❌ URL do ícone do autor inválida.'
                    });
                }
                config.author = {
                    name: panel.author?.name || 'Autor',
                    iconURL: iconUrl
                };
            }
            
            if (interaction.options.getBoolean('timestamp') !== null) {
                config.timestamp = interaction.options.getBoolean('timestamp');
            }

            // Opções do select menu
            if (interaction.options.getString('opcoes-select')) {
                const opcoes = interaction.options.getString('opcoes-select');
                const opcoesList = opcoes.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
                
                if (opcoesList.length > 25) {
                    return interaction.editReply({
                        content: '❌ Máximo de 25 opções permitidas no select menu.'
                    });
                }

                const selectOptions = opcoesList.map((opcao, index) => ({
                    label: opcao,
                    value: `${panelId}_option_${index}`,
                    description: `Selecionar ${opcao}`
                }));

                config.selectOptions = selectOptions;
                config.hasSelectMenu = selectOptions.length > 0;
            }

            // Verificar se pelo menos uma configuração foi fornecida
            if (Object.keys(config).length === 0) {
                return interaction.editReply({
                    content: '❌ Você deve especificar pelo menos uma configuração para alterar.'
                });
            }

            // Atualizar no database
            const updatedPanel = database.updatePanel(panelId, config);

            // Confirmar atualização
            const configFields = [];
            
            if (config.title) configFields.push({ name: 'Título', value: config.title, inline: true });
            if (config.description) configFields.push({ name: 'Descrição', value: config.description.length > 100 ? config.description.substring(0, 100) + '...' : config.description, inline: false });
            if (config.color) configFields.push({ name: 'Cor', value: config.color, inline: true });
            if (config.footer) configFields.push({ name: 'Rodapé', value: config.footer, inline: true });
            if (config.banner) configFields.push({ name: 'Banner', value: '✅ Configurado', inline: true });
            if (config.thumbnail) configFields.push({ name: 'Thumbnail', value: '✅ Configurado', inline: true });
            if (config.author) configFields.push({ name: 'Autor', value: config.author.name, inline: true });
            if (config.timestamp !== undefined) configFields.push({ name: 'Timestamp', value: config.timestamp ? 'Ativado' : 'Desativado', inline: true });
            if (config.selectOptions) configFields.push({ name: 'Opções Select', value: `${config.selectOptions.length} opções`, inline: true });

            const successEmbed = new EmbedBuilder()
                .setColor('#27ae60')
                .setTitle('✅ Painel Configurado')
                .setDescription(`Configurações do painel \`${panelId}\` foram atualizadas!`)
                .addFields(...configFields)
                .setFooter({ text: 'Use /sync-painel para aplicar as mudanças' })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Erro ao configurar painel:', error);
            await interaction.editReply({
                content: '❌ Erro ao configurar o painel.'
            });
        }
    },

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
};
