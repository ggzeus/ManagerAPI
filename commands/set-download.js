const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-download')
        .setDescription('Criar painel de download no canal atual')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const channelId = interaction.channel.id;
            
            // Verificar se já existe configuração de download neste canal
            const existingConfig = database.getDownloadConfig(guildId, channelId);
            
            if (existingConfig) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ Painel já existe')
                        .setDescription('Já existe um painel de download neste canal. Use `/config-download` para editar ou `/sync-download` para sincronizar.')
                        .setColor('#ff0000')
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Criar configuração padrão
            const defaultConfig = {
                title: '📥 Download Menu',
                description: 'Clique no botão abaixo para baixar o menu',
                color: '#00ff00',
                fileName: 'menu.rar',
                fileUrl: null,
                buttonText: '📥 Baixar Menu'
            };
            
            // Salvar no database
            database.setDownloadConfig(guildId, channelId, defaultConfig);
            
            // Criar embed do painel
            const downloadEmbed = new EmbedBuilder()
                .setTitle(defaultConfig.title)
                .setDescription(defaultConfig.description)
                .setColor(defaultConfig.color)
                .setTimestamp();
            
            // Criar botão
            const downloadButton = new ButtonBuilder()
                .setCustomId(`download_menu_${channelId}`)
                .setLabel(defaultConfig.buttonText)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true); // Desabilitado até configurar arquivo
            
            const row = new ActionRowBuilder().addComponents(downloadButton);
            
            // Enviar painel
            const message = await interaction.channel.send({
                embeds: [downloadEmbed],
                components: [row]
            });
            
            // Resposta de confirmação
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('✅ Painel criado com sucesso!')
                    .setDescription(`Painel de download criado em ${interaction.channel}\n\n⚠️ **Próximos passos:**\n1. Use \`/config-download\` para configurar título, descrição e arquivo\n2. O botão será habilitado após o upload do arquivo`)
                    .setColor('#00ff00')
                ],
                flags: MessageFlags.Ephemeral
            });
            
        } catch (error) {
            console.error('Erro no comando set-download:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('❌ Erro')
                    .setDescription('Ocorreu um erro ao criar o painel de download.')
                    .setColor('#ff0000')
                ],
                flags: MessageFlags.Ephemeral
            });
        }
    },
};
