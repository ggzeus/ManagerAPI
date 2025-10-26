const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Ver todos os comandos disponíveis')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has('Administrator');
        
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📚 Comandos Disponíveis')
            .setDescription('Lista de todos os comandos do bot')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setTimestamp();

        // Comandos de usuário
        embed.addFields({
            name: '👤 Comandos de Usuário',
            value: [
                '`/verify` - Verificar sua licença KeyAuth',
                '`/mylicense` - Ver informações da sua licença',
                '`/ticket` - Criar um ticket de suporte',
                '`/help` - Mostrar esta mensagem'
            ].join('\n'),
            inline: false
        });

        // Comandos de admin (apenas para admins)
        if (isAdmin) {
            embed.addFields({
                name: '🛠️ Comandos de Administrador',
                value: [
                    '`/createkey` - Criar nova(s) licença(s)',
                    '`/deletekey` - Deletar uma licença',
                    '`/extendkey` - Estender duração de uma licença',
                    '`/checkkey` - Verificar informações de uma licença',
                    '`/listkeys` - Listar todas as licenças',
                    '`/unverify` - Remover verificação de um usuário',
                    '`/listverified` - Listar usuários verificados',
                    '`/stats` - Ver estatísticas do servidor'
                ].join('\n'),
                inline: false
            });
        }

        embed.addFields({
            name: '🔗 Links Úteis',
            value: [
                '[KeyAuth Dashboard](https://keyauth.cc)',
                '[Documentação](https://docs.keyauth.cc)',
                '[Suporte](https://discord.gg/keyauth)'
            ].join('\n'),
            inline: false
        });

        embed.setFooter({ 
            text: `Bot Manager v1.0 | Solicitado por ${interaction.user.tag}` 
        });

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },
};
