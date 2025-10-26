const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('send-note')
        .setDescription('Enviar nota de atualização sobre correções de bugs')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            // Mensagem que será enviada
            const noteMessage = `### Todas funções reportadas já entraram em processo de correção !
-# Caso tenha mais alguma para reportar, avise o mais rápido possível para que seja corrigido ainda nessa atualização!! (Não precisa reportar caso ja tenha sido reportado)

|| @everyone ||`;

            // Enviar a mensagem no canal atual
            await interaction.channel.send(noteMessage);
            
            // Resposta de confirmação (ephemeral)
            await interaction.reply({
                content: '✅ Nota de atualização enviada com sucesso!',
                flags: MessageFlags.Ephemeral
            });
            
            console.log(`📝 Nota de atualização enviada por ${interaction.user.tag} em ${interaction.channel.name}`);
            
        } catch (error) {
            console.error('Erro no comando send-note:', error);
            await interaction.reply({
                content: '❌ Erro ao enviar a nota de atualização.',
                flags: MessageFlags.Ephemeral
            });
        }
    },
};
