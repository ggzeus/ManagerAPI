const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-fix')
        .setDescription('Criar painel de fix no canal atual')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const channelId = interaction.channel.id;
            
            // Verificar se já existe painel neste canal
            const existingPanel = database.getFixPanel(guildId, channelId);
            
            if (existingPanel) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ Painel já existe')
                        .setDescription('Já existe um painel de fix neste canal. Use `/config-fix` para editar ou `/sync-fix` para sincronizar.')
                        .setColor('#ff0000')
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Criar configuração padrão
            const defaultConfig = {
                title: '🔧 Sistema de Fix',
                description: 'Selecione uma categoria abaixo para reportar problemas',
                color: '#00ff00',
                categories: {}
            };
            
            // Salvar no database
            database.setFixPanel(guildId, channelId, defaultConfig);
            
            // Criar embed do painel
            const fixEmbed = new EmbedBuilder()
                .setTitle(defaultConfig.title)
                .setDescription(defaultConfig.description)
                .setColor(defaultConfig.color)
                .setTimestamp()
                .setFooter({ text: 'Use /config-fix para configurar categorias' });
            
            // Como não há categorias ainda, mostrar painel vazio
            const message = await interaction.channel.send({
                embeds: [fixEmbed],
                components: [] // Sem botões até configurar categorias
            });
            
            // Resposta de confirmação
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('✅ Painel criado com sucesso!')
                    .setDescription(`Painel de fix criado em ${interaction.channel}\n\n⚠️ **Próximos passos:**\n1. Use \`/config-fix\` para configurar título, descrição e cor\n2. Use o botão "Gerenciar Categorias" para adicionar categorias e subcategorias`)
                    .setColor('#00ff00')
                ],
                flags: MessageFlags.Ephemeral
            });
            
        } catch (error) {
            console.error('Erro no comando set-fix:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('❌ Erro')
                    .setDescription('Ocorreu um erro ao criar o painel de fix.')
                    .setColor('#ff0000')
                ],
                flags: MessageFlags.Ephemeral
            });
        }
    },
};
