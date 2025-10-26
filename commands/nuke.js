const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('💥 Deleta e recria o canal atual com as mesmas configurações')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            // Verificar se é um canal de texto
            if (interaction.channel.type !== ChannelType.GuildText) {
                return await interaction.reply({
                    content: '❌ Este comando só pode ser usado em canais de texto!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Salvar informações do canal atual
            const currentChannel = interaction.channel;
            const channelName = currentChannel.name;
            const channelTopic = currentChannel.topic;
            const channelParent = currentChannel.parent;
            const channelPosition = currentChannel.position;
            const channelPermissions = currentChannel.permissionOverwrites.cache.map(overwrite => ({
                id: overwrite.id,
                type: overwrite.type,
                allow: overwrite.allow.toArray(),
                deny: overwrite.deny.toArray()
            }));

            // Confirmar ação
            await interaction.reply({
                content: `💥 **NUKE ATIVADO!**\n\nRecriando canal \`${channelName}\`...\nEste canal será deletado em 3 segundos!`,
                ephemeral: false
            });

            // Aguardar 3 segundos
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Criar novo canal com as mesmas configurações
            const newChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                topic: channelTopic,
                parent: channelParent,
                position: channelPosition,
                permissionOverwrites: channelPermissions
            });

            // Enviar mensagem de confirmação no novo canal
            await newChannel.send({
                content: `Nuked by \`${interaction.user.tag}\``
            });

            // Deletar canal atual
            await currentChannel.delete(`Canal nukado por ${interaction.user.tag}`);

            console.log(`💥 Canal ${channelName} foi nukado por ${interaction.user.tag}`);

        } catch (error) {
            console.error('Erro ao nukar canal:', error);
            
            // Tentar responder se a interação ainda estiver válida
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Erro ao nukar o canal!',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};
