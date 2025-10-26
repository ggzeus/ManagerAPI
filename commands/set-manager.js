const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-manager')
        .setDescription('🛠️ Painel de gerenciamento completo do sistema'),
    
    async execute(interaction) {
        // Verificar se o usuário tem permissão de administrador
        if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            return interaction.reply({
                content: '❌ Você não tem permissão para usar este comando.',
                flags: ['Ephemeral']
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🛠️ Scarlet ® - Painel de Gerenciamento')
            .setDescription('**⚙️ | Qual sistema você deseja gerenciar?**\n\n' +
                           '🔑 **Gerenciar Keys** - Criar, deletar, verificar, banir keys\n' +
                           '👥 **Gerenciar Users** - Administrar usuários do sistema')
            .setColor('#9b59b6')
            .setFooter({ text: 'Scarlet ® • Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('manage_keys')
                    .setLabel('🔑 Gerenciar Keys')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔑'),
                new ButtonBuilder()
                    .setCustomId('manage_users')
                    .setLabel('👥 Gerenciar Users')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👥')
            );

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
};