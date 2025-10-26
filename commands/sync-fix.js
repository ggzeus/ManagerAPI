const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync-fix')
        .setDescription('Sincronizar configurações de painel de fix entre canais')
        .addChannelOption(option =>
            option.setName('canal_origem')
                .setDescription('Canal de onde copiar as configurações')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('canal_destino')
                .setDescription('Canal para onde copiar as configurações (deixe vazio para usar o atual)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const sourceChannel = interaction.options.getChannel('canal_origem');
            const targetChannel = interaction.options.getChannel('canal_destino') || interaction.channel;
            
            // Verificar se é o mesmo canal
            if (sourceChannel.id === targetChannel.id) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ Erro')
                        .setDescription('O canal de origem e destino não podem ser o mesmo.')
                        .setColor('#ff0000')
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Obter configuração do canal de origem
            const sourcePanel = database.getFixPanel(guildId, sourceChannel.id);
            
            if (!sourcePanel) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ Painel não encontrado')
                        .setDescription(`Não existe painel de fix no canal ${sourceChannel}.`)
                        .setColor('#ff0000')
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Verificar se já existe painel no canal de destino
            const targetPanel = database.getFixPanel(guildId, targetChannel.id);
            
            if (targetPanel) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ Canal já configurado')
                        .setDescription(`O canal ${targetChannel} já possui um painel de fix. Use \`/config-fix\` para editar ou remova o painel existente primeiro.`)
                        .setColor('#ff0000')
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Copiar configuração
            database.setFixPanel(guildId, targetChannel.id, {
                title: sourcePanel.title,
                description: sourcePanel.description,
                color: sourcePanel.color,
                categories: JSON.parse(JSON.stringify(sourcePanel.categories)) // Deep copy
            });
            
            // Criar painel no canal de destino
            const fixEmbed = new EmbedBuilder()
                .setTitle(sourcePanel.title)
                .setDescription(sourcePanel.description)
                .setColor(sourcePanel.color)
                .setTimestamp();
            
            // Criar botões das categorias se existirem
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const components = [];
            
            const categories = Object.entries(sourcePanel.categories);
            if (categories.length > 0) {
                const rows = [];
                for (let i = 0; i < categories.length; i += 5) {
                    const row = new ActionRowBuilder();
                    const categorySlice = categories.slice(i, i + 5);
                    
                    for (const [categoryId, categoryData] of categorySlice) {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`fix_category_${targetChannel.id}_${categoryId}`)
                                .setLabel(`${categoryData.emoji} ${categoryData.name}`)
                                .setStyle(ButtonStyle.Secondary)
                        );
                    }
                    rows.push(row);
                }
                components.push(...rows);
            }
            
            // Enviar painel no canal de destino
            await targetChannel.send({
                embeds: [fixEmbed],
                components: components
            });
            
            // Resposta de confirmação
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('✅ Sincronização concluída!')
                    .setDescription(`Painel de fix copiado de ${sourceChannel} para ${targetChannel}`)
                    .addFields(
                        { name: '📋 Configurações copiadas', value: `**Título:** ${sourcePanel.title}\n**Categorias:** ${Object.keys(sourcePanel.categories).length}\n**Cor:** ${sourcePanel.color}`, inline: false }
                    )
                    .setColor('#00ff00')
                ],
                flags: MessageFlags.Ephemeral
            });
            
        } catch (error) {
            console.error('Erro no comando sync-fix:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('❌ Erro')
                    .setDescription('Ocorreu um erro ao sincronizar as configurações.')
                    .setColor('#ff0000')
                ],
                flags: MessageFlags.Ephemeral
            });
        }
    },
};
