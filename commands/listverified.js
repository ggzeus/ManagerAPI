const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listverified')
        .setDescription('Listar todos os usuários verificados')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option =>
            option.setName('pagina')
                .setDescription('Número da página')
                .setRequired(false)
                .setMinValue(1)),
    
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const page = interaction.options.getInteger('pagina') || 1;
        const perPage = 10;

        // Obter todos os usuários verificados
        const allUsers = database.getAllUsers();
        const verifiedUsers = Object.entries(allUsers)
            .filter(([_, userData]) => userData.verified)
            .map(([userId, userData]) => ({ userId, ...userData }));

        if (verifiedUsers.length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setColor('#f39c12')
                .setTitle('📋 Nenhum Usuário Verificado')
                .setDescription('Não há usuários verificados no sistema.')
                .setTimestamp();

            return interaction.editReply({ embeds: [emptyEmbed] });
        }

        // Paginação
        const totalPages = Math.ceil(verifiedUsers.length / perPage);
        const currentPage = Math.min(page, totalPages);
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        const pageUsers = verifiedUsers.slice(startIndex, endIndex);

        // Criar embed
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('👥 Usuários Verificados')
            .setDescription(`Total de usuários verificados: **${verifiedUsers.length}**`)
            .setFooter({ text: `Página ${currentPage}/${totalPages}` })
            .setTimestamp();

        // Adicionar usuários ao embed
        for (let i = 0; i < pageUsers.length; i++) {
            const user = pageUsers[i];
            const verifiedDate = user.verifiedAt ? 
                `<t:${Math.floor(new Date(user.verifiedAt).getTime() / 1000)}:R>` : 
                'Desconhecido';

            embed.addFields({
                name: `${startIndex + i + 1}. ${user.username || 'Usuário Desconhecido'}`,
                value: [
                    `**ID:** ${user.userId}`,
                    `**Licença:** ||${user.licenseKey || 'N/A'}||`,
                    `**Verificado:** ${verifiedDate}`
                ].join('\n'),
                inline: true
            });
        }

        // Adicionar instruções de navegação se houver múltiplas páginas
        if (totalPages > 1) {
            embed.addFields({
                name: '📖 Navegação',
                value: `Use \`/listverified pagina:${currentPage + 1}\` para próxima página`,
                inline: false
            });
        }

        return interaction.editReply({ embeds: [embed] });
    },
};
