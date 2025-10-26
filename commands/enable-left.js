const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enable-left')
        .setDescription('🚶 Ativar/desativar logs de saída de membros no canal atual')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const channelId = interaction.channel.id;
            const guildId = interaction.guild.id;
            
            // Verificar status atual
            const currentStatus = database.getLeftLogStatus(guildId);
            
            if (currentStatus && currentStatus.channelId === channelId) {
                // Desativar se já estiver ativo neste canal
                database.setLeftLogStatus(guildId, null);
                
                const embed = new EmbedBuilder()
                    .setTitle('🚶 Logs de Saída Desativados')
                    .setDescription('Os logs de saída de membros foram **desativados**.')
                    .setColor('#ff6b6b')
                    .setTimestamp();
                
                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
                
            } else {
                // Ativar neste canal
                database.setLeftLogStatus(guildId, {
                    channelId: channelId,
                    enabled: true,
                    enabledBy: interaction.user.id,
                    enabledAt: new Date().toISOString()
                });
                
                const embed = new EmbedBuilder()
                    .setTitle('🚶 Logs de Saída Ativados')
                    .setDescription(`Os logs de saída de membros foram **ativados** neste canal.\n\n📍 **Canal:** ${interaction.channel}\n👤 **Ativado por:** ${interaction.user}`)
                    .setColor('#00ff00')
                    .setTimestamp();
                
                await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
                
                // Enviar uma mensagem de teste
                const testEmbed = new EmbedBuilder()
                    .setTitle('🚶 Sistema de Logs Ativado')
                    .setDescription('Este canal agora recebe logs de **saída** de membros.')
                    .setColor('#e74c3c')
                    .setTimestamp();
                
                await interaction.followUp({
                    embeds: [testEmbed]
                });
            }
            
            console.log(`🚶 Logs de saída ${currentStatus && currentStatus.channelId === channelId ? 'desativados' : 'ativados'} por ${interaction.user.tag}`);
            
        } catch (error) {
            console.error('Erro ao configurar logs de saída:', error);
            await interaction.reply({
                content: '❌ Erro ao configurar os logs de saída!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
