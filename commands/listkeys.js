const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const keyauth = require('../utils/keyauth');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listkeys')
        .setDescription('Listar todas as licenças do KeyAuth')
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

        // Obter todas as licenças
        const result = await keyauth.listAllLicenses();

        if (!result.success || !result.licenses) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Erro')
                .setDescription('Não foi possível listar as licenças')
                .setTimestamp();

            return interaction.editReply({ embeds: [errorEmbed] });
        }

        const licenses = Array.isArray(result.licenses) ? result.licenses : [];
        
        if (licenses.length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setColor('#f39c12')
                .setTitle('📋 Nenhuma Licença')
                .setDescription('Não há licenças cadastradas no KeyAuth')
                .setTimestamp();

            return interaction.editReply({ embeds: [emptyEmbed] });
        }

        // Paginação
        const totalPages = Math.ceil(licenses.length / perPage);
        const currentPage = Math.min(page, totalPages);
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        const pageLicenses = licenses.slice(startIndex, endIndex);

        // Criar embed
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📋 Lista de Licenças')
            .setDescription(`Total de licenças: **${licenses.length}**`)
            .setFooter({ text: `Página ${currentPage}/${totalPages}` })
            .setTimestamp();

        // Adicionar licenças ao embed
        for (const license of pageLicenses) {
            const key = license.key || license.license || 'Desconhecida';
            const expires = license.expires ? `<t:${license.expires}:R>` : 'Nunca';
            const status = license.banned ? '🚫 Banida' : (
                license.expires && license.expires * 1000 < Date.now() ? '❌ Expirada' : '✅ Ativa'
            );

            embed.addFields({
                name: `🔑 ${key.substring(0, 20)}...`,
                value: `**Status:** ${status}\n**Expira:** ${expires}`,
                inline: true
            });
        }

        return interaction.editReply({ embeds: [embed] });
    },
};
