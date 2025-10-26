const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enable-entry')
        .setDescription('🚪 Ativar/desativar logs de entrada de membros no canal atual')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const channelId = interaction.channel.id;
            const guildId = interaction.guild.id;
            
            // Verificar status atual
            const currentStatus = database.getEntryLogStatus(guildId);
            
            if (currentStatus && currentStatus.channelId === channelId) {
                // Desativar se já estiver ativo neste canal
                database.setEntryLogStatus(guildId, null);
                
                const embed = new EmbedBuilder()
                    .setTitle('🚪 Logs de Entrada Desativados')
                    .setDescription('Os logs de entrada de membros foram **desativados**.')
                    .setColor('#ff6b6b')
                    .setTimestamp();
                
                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
                
            } else {
                // Ativar neste canal
                database.setEntryLogStatus(guildId, {
                    channelId: channelId,
                    enabled: true,
                    enabledBy: interaction.user.id,
                    enabledAt: new Date().toISOString()
                });
                
                const embed = new EmbedBuilder()
                    .setTitle('🚪 Logs de Entrada Ativados')
                    .setDescription(`Os logs de entrada de membros foram **ativados** neste canal.\n\n📍 **Canal:** ${interaction.channel}\n👤 **Ativado por:** ${interaction.user}`)
                    .setColor('#00ff00')
                    .setTimestamp();
                
                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
                
                // Enviar uma mensagem de teste
                const testEmbed = new EmbedBuilder()
                    .setTitle('🚪 Sistema de Logs Ativado')
                    .setDescription('Este canal agora recebe logs de **entrada** de membros.')
                    .setColor('#3498db')
                    .setTimestamp();
                
                await interaction.followUp({
                    embeds: [testEmbed]
                });
            }
            
            console.log(`🚪 Logs de entrada ${currentStatus && currentStatus.channelId === channelId ? 'desativados' : 'ativados'} por ${interaction.user.tag}`);
            
        } catch (error) {
            console.error('Erro ao configurar logs de entrada:', error);
            await interaction.reply({
                content: '❌ Erro ao configurar os logs de entrada!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
