const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config-hwid')
        .setDescription('⚙️ Configura as propriedades do sistema de HWID')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID do sistema de HWID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Título da embed')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Descrição da embed')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Cor da embed (ex: #ff0000)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('thumbnail')
                .setDescription('URL da thumbnail')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('URL da imagem')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('button_text')
                .setDescription('Texto do botão')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const hwidId = interaction.options.getString('id');
        
        try {
            // Verificar se o sistema existe
            const hwid = database.getHwid(hwidId);
            if (!hwid) {
                return await interaction.reply({
                    content: '❌ Sistema de HWID não encontrado!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Obter as opções fornecidas
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const color = interaction.options.getString('color');
            const thumbnail = interaction.options.getString('thumbnail');
            const image = interaction.options.getString('image');
            const buttonText = interaction.options.getString('button_text');

            // Atualizar apenas os campos fornecidos
            const updates = {};
            if (title) updates.title = title;
            if (description) updates.description = description;
            if (color) updates.color = color;
            if (thumbnail) updates.thumbnail = thumbnail;
            if (image) updates.image = image;
            if (buttonText) updates.buttonText = buttonText;

            // Verificar se há atualizações
            if (Object.keys(updates).length === 0) {
                return await interaction.reply({
                    content: '❌ Nenhuma configuração foi fornecida!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Validar URL se fornecida
            if (thumbnail && !isValidUrl(thumbnail)) {
                return await interaction.reply({
                    content: '❌ URL da thumbnail inválida!',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (image && !isValidUrl(image)) {
                return await interaction.reply({
                    content: '❌ URL da imagem inválida!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Validar cor se fornecida
            if (color && !isValidColor(color)) {
                return await interaction.reply({
                    content: '❌ Cor inválida! Use o formato #hexadecimal (ex: #ff0000)',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Atualizar no database
            database.updateHwid(hwidId, updates);

            // Criar embed de confirmação
            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ Sistema de HWID Configurado')
                .setDescription(`Sistema \`${hwidId}\` foi atualizado com sucesso!`)
                .setColor('#00ff00')
                .setTimestamp();

            // Adicionar campos atualizados
            Object.entries(updates).forEach(([key, value]) => {
                let fieldName = key.charAt(0).toUpperCase() + key.slice(1);
                if (key === 'buttonText') fieldName = 'Texto do Botão';
                confirmEmbed.addFields({ 
                    name: fieldName, 
                    value: value.toString(), 
                    inline: true 
                });
            });

            await interaction.reply({
                embeds: [confirmEmbed],
                flags: MessageFlags.Ephemeral
            });

            console.log(`✅ Sistema de HWID configurado: ${hwidId}`);

        } catch (error) {
            console.error('Erro ao configurar sistema de HWID:', error);
            await interaction.reply({
                content: '❌ Erro ao configurar o sistema de HWID!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function isValidColor(color) {
    return /^#[0-9A-F]{6}$/i.test(color);
}
