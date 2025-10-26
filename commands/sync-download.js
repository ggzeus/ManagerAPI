const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync-download')
        .setDescription('Sincronizar configurações de download entre canais')
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
            const sourceConfig = database.getDownloadConfig(guildId, sourceChannel.id);
            
            if (!sourceConfig) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ Configuração não encontrada')
                        .setDescription(`Não existe configuração de download no canal ${sourceChannel}.`)
                        .setColor('#ff0000')
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Verificar se já existe configuração no canal de destino
            const targetConfig = database.getDownloadConfig(guildId, targetChannel.id);
            
            if (targetConfig) {
                return await interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ Canal já configurado')
                        .setDescription(`O canal ${targetChannel} já possui um painel de download. Use \`/config-download\` para editar ou remova o painel existente primeiro.`)
                        .setColor('#ff0000')
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Copiar configuração
            database.setDownloadConfig(guildId, targetChannel.id, {
                title: sourceConfig.title,
                description: sourceConfig.description,
                color: sourceConfig.color,
                fileName: sourceConfig.fileName,
                fileUrl: sourceConfig.fileUrl,
                buttonText: sourceConfig.buttonText
            });
            
            // Criar embed do painel no canal de destino
            const downloadEmbed = new EmbedBuilder()
                .setTitle(sourceConfig.title)
                .setDescription(sourceConfig.description)
                .setColor(sourceConfig.color)
                .setTimestamp();
            
            // Criar botão
            const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
            const downloadButton = new ButtonBuilder()
                .setCustomId(`download_menu_${targetChannel.id}`)
                .setLabel(sourceConfig.buttonText)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!sourceConfig.fileUrl); // Desabilitado se não tiver arquivo
            
            const row = new ActionRowBuilder().addComponents(downloadButton);
            
            // Enviar painel no canal de destino
            await targetChannel.send({
                embeds: [downloadEmbed],
                components: [row]
            });
            
            // Resposta de confirmação
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('✅ Sincronização concluída!')
                    .setDescription(`Configurações copiadas de ${sourceChannel} para ${targetChannel}`)
                    .addFields(
                        { name: '📋 Configurações copiadas', value: `**Título:** ${sourceConfig.title}\n**Arquivo:** ${sourceConfig.fileName}\n**Status:** ${sourceConfig.fileUrl ? '🟢 Configurado' : '🔴 Não configurado'}`, inline: false }
                    )
                    .setColor('#00ff00')
                ],
                flags: MessageFlags.Ephemeral
            });
            
        } catch (error) {
            console.error('Erro no comando sync-download:', error);
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
