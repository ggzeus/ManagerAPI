const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../utils/database');
require('dotenv').config();

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Ignorar mensagens de bots
        if (message.author.bot) return;

        // ========== SISTEMA DE SUGESTÕES ==========
        // Verificar se sugestões estão habilitadas neste canal
        const isSuggestionChannel = database.isSuggestionEnabled(message.guild.id, message.channel.id);
        
        if (isSuggestionChannel) {
            try {
                // Adicionar reações de votação
                await message.react('✅');
                await message.react('❌');
                
                // Criar tópico na mensagem
                const thread = await message.startThread({
                    name: 'O que acharam da sugestão?',
                    autoArchiveDuration: 1440, // 24 horas
                    reason: 'Tópico automático para discussão da sugestão'
                });
                
                console.log(`💡 Sugestão processada de ${message.author.tag} em ${message.channel.name}`);
                
            } catch (error) {
                console.error('Erro ao processar sugestão:', error);
            }
            
            // Se for canal de sugestão, não continuar com a lógica de HWID
            return;
        }

        // ========== SISTEMA DE ARRANGE (REPORTES) ==========
        // Verificar se arrange está habilitado neste canal
        const isArrangeChannel = database.isArrangeEnabled(message.guild.id, message.channel.id);
        
        if (isArrangeChannel) {
            try {
                // Adicionar reações de confirmação
                await message.react('✅');
                await message.react('❌');
                
                // Criar tópico na mensagem
                const thread = await message.startThread({
                    name: 'Isso aconteceu com mais alguém?',
                    autoArchiveDuration: 1440, // 24 horas
                    reason: 'Tópico automático para discussão do reporte'
                });
                
                console.log(`🐛 Reporte processado de ${message.author.tag} em ${message.channel.name}`);
                
            } catch (error) {
                console.error('Erro ao processar reporte:', error);
            }
            
            // Se for canal de arrange, não continuar com a lógica de HWID
            return;
        }

        // ========== SISTEMA DE HWID ==========
        // Verificar se é um canal de HWID
        if (!message.channel.name.startsWith('⛔・')) return;

        // Verificar se existe um processo ativo para este canal
        const process = database.getHwidProcess(message.channel.id);
        if (!process) return;

        // Verificar se a mensagem é do usuário do processo
        if (message.author.id !== process.userId) return;

        try {
            // Processar baseado no passo atual
            if (process.step === 1) {
                // Passo 1: Capturar usuário do menu
                const username = message.content.trim();
                
                // Atualizar processo
                database.updateHwidProcess(message.channel.id, {
                    username: username,
                    step: 2
                });

                // Deletar mensagem do usuário
                await message.delete();

                // Atualizar embed para passo 2
                const embed = new EmbedBuilder()
                    .setTitle('⚙️ Scarlet ® - HWID System')
                    .setDescription('**Passo 2/3**\n\nPor que você está solicitando reset? (Formatei o pc, etc...)')
                    .setColor('#ff6b6b')
                    .setFooter({ text: 'Digite sua resposta na mensagem abaixo' })
                    .setTimestamp();

                // Buscar e editar a mensagem da embed
                const messages = await message.channel.messages.fetch({ limit: 10 });
                const embedMessage = messages.find(msg => 
                    msg.author.id === client.user.id && 
                    msg.embeds.length > 0 && 
                    msg.embeds[0].title === '⚙️ Scarlet ® - HWID System'
                );

                if (embedMessage) {
                    await embedMessage.edit({ embeds: [embed] });
                }

            } else if (process.step === 2) {
                // Passo 2: Capturar motivo
                const reason = message.content.trim();
                
                // Atualizar processo
                database.updateHwidProcess(message.channel.id, {
                    reason: reason,
                    step: 3
                });

                // Deletar mensagem do usuário
                await message.delete();

                // Atualizar embed para passo 3
                const embed = new EmbedBuilder()
                    .setTitle('⚙️ Scarlet ® - HWID System')
                    .setDescription('**Passo 3/3**\n\nEnvie uma imagem como prova da formatação.')
                    .setColor('#ff6b6b')
                    .setFooter({ text: 'Envie uma imagem/screenshot como anexo' })
                    .setTimestamp();

                // Buscar e editar a mensagem da embed
                const messages = await message.channel.messages.fetch({ limit: 10 });
                const embedMessage = messages.find(msg => 
                    msg.author.id === client.user.id && 
                    msg.embeds.length > 0 && 
                    msg.embeds[0].title === '⚙️ Scarlet ® - HWID System'
                );

                if (embedMessage) {
                    await embedMessage.edit({ embeds: [embed] });
                }

            } else if (process.step === 3) {
                // Passo 3: Capturar imagem
                if (message.attachments.size === 0) {
                    const errorMsg = await message.channel.send('❌ Por favor, envie uma imagem como anexo.');
                    setTimeout(() => errorMsg.delete(), 5000);
                    return;
                }

                const attachment = message.attachments.first();
                if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
                    const errorMsg = await message.channel.send('❌ Por favor, envie apenas arquivos de imagem.');
                    setTimeout(() => errorMsg.delete(), 5000);
                    return;
                }

                // Atualizar processo com a imagem
                database.updateHwidProcess(message.channel.id, {
                    proofImage: attachment.url,
                    step: 4 // Processo completo
                });

                // Deletar mensagem do usuário
                await message.delete();

                // Limpar todas as mensagens do canal
                const allMessages = await message.channel.messages.fetch({ limit: 50 });
                const messagesToDelete = allMessages.filter(msg => !msg.pinned);
                await message.channel.bulkDelete(messagesToDelete);

                // Obter dados atualizados do processo
                const updatedProcess = database.getHwidProcess(message.channel.id);

                // Criar embed final para aprovação
                const finalEmbed = new EmbedBuilder()
                    .setTitle('⚙️ Scarlet ® - HWID System')
                    .setDescription('**Solicitação de Reset HWID**\n\nRevisão para aprovação:')
                    .addFields(
                        { name: '👤 Usuário', value: updatedProcess.username, inline: true },
                        { name: '📝 Motivo', value: updatedProcess.reason, inline: true },
                        { name: '📅 Solicitado em', value: `<t:${Math.floor(new Date(updatedProcess.createdAt).getTime() / 1000)}:F>`, inline: false }
                    )
                    .setImage(updatedProcess.proofImage)
                    .setColor('#ffaa00')
                    .setFooter({ text: 'Apenas administradores podem aprovar/recusar' })
                    .setTimestamp();

                // Criar botões de aprovação/recusa
                const approveButton = new ButtonBuilder()
                    .setCustomId(`hwid_approve_${message.channel.id}`)
                    .setLabel('✅ Aprovar')
                    .setStyle(ButtonStyle.Success);

                const rejectButton = new ButtonBuilder()
                    .setCustomId(`hwid_reject_${message.channel.id}`)
                    .setLabel('❌ Recusar')
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder()
                    .addComponents(approveButton, rejectButton);

                // Usar o ID direto do admin role
                const adminRoleId = '1366229765517742152';
                
                await message.channel.send({
                    content: `<@&${adminRoleId}>`,
                    embeds: [finalEmbed],
                    components: [row]
                });

                console.log(`📋 Processo HWID completo para ${message.author.tag}, aguardando aprovação`);
            }

        } catch (error) {
            console.error('Erro ao processar mensagem HWID:', error);
            await message.channel.send('❌ Erro interno. Tente novamente.').then(msg => {
                setTimeout(() => msg.delete(), 5000);
            });
        }
    }
};