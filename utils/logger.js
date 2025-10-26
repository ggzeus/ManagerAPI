const { EmbedBuilder } = require('discord.js');
const database = require('./database');

class Logger {
    constructor(client) {
        this.client = client;
    }

    /**
     * Envia um log para o canal de logs
     * @param {string} type - Tipo do log (info, success, error, warning)
     * @param {string} title - Título do log
     * @param {string} description - Descrição do log
     * @param {Object} fields - Campos adicionais
     */
    async log(type, title, description, fields = []) {
        try {
            const logsChannelId = process.env.LOGS_CHANNEL_ID;
            if (!logsChannelId) return;

            const channel = await this.client.channels.fetch(logsChannelId);
            if (!channel) return;

            const colors = {
                info: '#3498db',
                success: '#2ecc71',
                error: '#e74c3c',
                warning: '#f39c12',
                license: '#9b59b6',
                ticket: '#1abc9c'
            };

            const emojis = {
                info: 'ℹ️',
                success: '✅',
                error: '❌',
                warning: '⚠️',
                license: '🔑',
                ticket: '🎫'
            };

            const embed = new EmbedBuilder()
                .setColor(colors[type] || colors.info)
                .setTitle(`${emojis[type] || ''} ${title}`)
                .setDescription(description)
                .setTimestamp();

            if (fields.length > 0) {
                embed.addFields(fields);
            }

            await channel.send({ embeds: [embed] });

            // Salvar no database
            database.addLog({
                type,
                title,
                description,
                fields
            });
        } catch (error) {
            console.error('Erro ao enviar log:', error);
        }
    }

    async logLicenseVerification(user, licenseKey, success) {
        await this.log(
            success ? 'success' : 'error',
            'Verificação de Licença',
            `Usuário ${user.tag} tentou verificar uma licença`,
            [
                { name: 'Usuário', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Licença', value: `||${licenseKey}||`, inline: true },
                { name: 'Status', value: success ? '✅ Sucesso' : '❌ Falhou', inline: true }
            ]
        );
    }

    async logLicenseCreation(admin, licenseKeys, days) {
        await this.log(
            'license',
            'Licença Criada',
            `Admin criou nova(s) licença(s)`,
            [
                { name: 'Admin', value: `${admin.tag} (${admin.id})`, inline: true },
                { name: 'Quantidade', value: `${licenseKeys.length}`, inline: true },
                { name: 'Duração', value: `${days} dias`, inline: true },
                { name: 'Licenças', value: licenseKeys.map(k => `||${k}||`).join('\n') }
            ]
        );
    }

    async logTicketCreation(user, ticketChannel) {
        await this.log(
            'ticket',
            'Ticket Criado',
            `Novo ticket foi criado`,
            [
                { name: 'Usuário', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Canal', value: `${ticketChannel}`, inline: true }
            ]
        );
    }

    async logTicketClose(user, ticketChannel, closedBy) {
        await this.log(
            'ticket',
            'Ticket Fechado',
            `Ticket foi fechado`,
            [
                { name: 'Dono', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Canal', value: `${ticketChannel}`, inline: true },
                { name: 'Fechado por', value: `${closedBy.tag}`, inline: true }
            ]
        );
    }

    async logMemberJoin(member) {
        await this.log(
            'info',
            'Novo Membro',
            `Um novo membro entrou no servidor`,
            [
                { name: 'Usuário', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: 'Conta criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
            ]
        );
    }

    async logMemberLeave(member) {
        await this.log(
            'warning',
            'Membro Saiu',
            `Um membro saiu do servidor`,
            [
                { name: 'Usuário', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: 'Entrou em', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
            ]
        );
    }

    /**
     * Log de concessão de acesso temporário
     */
    async logAccessGrant(data) {
        await this.log(
            'license',
            '🔑 Acesso Concedido',
            `Acesso temporário concedido via licença`,
            [
                { name: 'Usuário', value: `<@${data.userId}> (${data.userId})`, inline: true },
                { name: 'Chave Utilizada', value: `\`${data.licenseKey}\``, inline: true },
                { name: 'Duração', value: `${Math.floor(data.duration / 86400)} dias`, inline: true },
                { name: 'Expira em', value: `<t:${Math.floor(new Date(data.expiresAt).getTime() / 1000)}:F>`, inline: false },
                { name: 'Sistema de Acesso', value: `\`${data.accessId}\``, inline: true }
            ]
        );
    }
}

module.exports = Logger;
