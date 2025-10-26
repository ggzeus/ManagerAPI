const express = require('express');
require('dotenv').config();

class DiscordWebServer {
    constructor(client) {
        this.client = client;
        this.port = process.env.PORT || process.env.WEB_SERVER_PORT || 8080;
        this.app = express();
        this.server = null;
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            next();
        });

        // JSON parsing
        this.app.use(express.json());

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`📥 ${req.method} ${req.url} - IP: ${req.ip}`);
            next();
        });
    }

    setupRoutes() {
        // Rota principal
        this.app.get('/', (req, res) => {
            this.handleRoot(req, res);
        });

        // Health check
        this.app.get('/health', (req, res) => {
            this.handleHealth(req, res);
        });

        // Check member
        this.app.get('/check-member', async (req, res) => {
            await this.handleCheckMember(req, res);
        });

        // Error handler
        this.app.use((error, req, res, next) => {
            console.error('❌ Erro no servidor:', error);
            this.sendError(res, 500, 'Erro interno do servidor');
        });
    }

    start() {
        this.server = this.app.listen(this.port, '0.0.0.0', () => {
            console.log(`🌐 Servidor web iniciado na porta ${this.port}`);
            const baseUrl = process.env.RAILWAY_STATIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${this.port}`;
            console.log(`📍 Endpoint disponível: ${baseUrl}/check-member?discordId=USER_ID`);
            console.log(`📍 Health check: ${baseUrl}/health`);
            console.log(`📍 Página inicial: ${baseUrl}/`);
        });

        this.server.on('error', (error) => {
            console.error('❌ Erro no servidor web:', error);
        });
    }

    async handleCheckMember(req, res) {
        const discordId = req.query.discordId;

        // Validar se o Discord ID foi fornecido
        if (!discordId) {
            return this.sendError(res, 400, 'Parâmetro discordId é obrigatório');
        }

        // Validar formato do Discord ID
        if (!/^\d{15,20}$/.test(discordId)) {
            return this.sendError(res, 400, 'Discord ID inválido');
        }

        try {
            // Obter o servidor principal
            const guildId = process.env.GUILD_ID;
            if (!guildId) {
                console.error('❌ GUILD_ID não configurado no .env');
                return this.sendError(res, 500, 'Configuração do servidor incorreta');
            }

            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                console.error('❌ Servidor não encontrado:', guildId);
                return this.sendError(res, 500, 'Servidor Discord não encontrado');
            }

            // Verificar se o usuário está no servidor
            let member = null;
            try {
                member = await guild.members.fetch(discordId);
            } catch (fetchError) {
                console.log(`📊 Verificação: ${discordId} - Não encontrado no servidor`);
            }

            const isInServer = member !== null;
            
            // Informações adicionais se o usuário estiver no servidor
            let memberInfo = null;
            if (isInServer) {
                memberInfo = {
                    id: member.id,
                    username: member.user.username,
                    displayName: member.displayName,
                    discriminator: member.user.discriminator,
                    tag: member.user.tag,
                    avatar: member.user.displayAvatarURL(),
                    joinedAt: member.joinedAt?.toISOString(),
                    roles: member.roles.cache
                        .filter(role => role.id !== guild.id)
                        .map(role => ({
                            id: role.id,
                            name: role.name,
                            color: role.hexColor
                        })),
                    isBot: member.user.bot,
                    premiumSince: member.premiumSince?.toISOString(),
                    nickname: member.nickname
                };

                console.log(`✅ Verificação: ${discordId} (${member.user.tag}) - Encontrado no servidor`);
            }

            const response = {
                success: true,
                discordId: discordId,
                isInServer: isInServer,
                serverName: guild.name,
                serverId: guild.id,
                checkedAt: new Date().toISOString(),
                member: memberInfo
            };

            this.sendSuccess(res, response);

        } catch (error) {
            console.error('❌ Erro ao verificar membro:', error);
            this.sendError(res, 500, 'Erro ao verificar membro no servidor');
        }
    }

    handleHealth(req, res) {
        const response = {
            success: true,
            status: 'online',
            bot: {
                username: this.client.user?.username,
                id: this.client.user?.id,
                ready: this.client.isReady()
            },
            servers: this.client.guilds.cache.size,
            users: this.client.users.cache.size,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };

        this.sendSuccess(res, response);
    }

    handleRoot(req, res) {
        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scarlet ® - Discord API</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #9b59b6; text-align: center; }
        .endpoint { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #9b59b6; }
        .method { background: #28a745; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
        code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
        .example { background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔮 Scarlet ® - Discord API</h1>
        <p>API para verificação de membros do servidor Discord.</p>
        
        <div class="endpoint">
            <h3><span class="method">GET</span> /check-member</h3>
            <p><strong>Descrição:</strong> Verifica se um usuário está no servidor Discord.</p>
            <p><strong>Parâmetros:</strong></p>
            <ul>
                <li><code>discordId</code> (obrigatório) - ID do usuário no Discord</li>
            </ul>
            
            <div class="example">
                <strong>Exemplo:</strong><br>
                <code>GET /check-member?discordId=123456789012345678</code>
            </div>
        </div>

        <div class="endpoint">
            <h3><span class="method">GET</span> /health</h3>
            <p><strong>Descrição:</strong> Verifica o status do bot e do servidor.</p>
        </div>

        <hr>
        <p style="text-align: center; color: #666;">
            Bot Status: <strong style="color: #28a745;">Online</strong> | 
            Servidores: <strong>${this.client.guilds.cache.size}</strong> | 
            Usuários: <strong>${this.client.users.cache.size}</strong>
        </p>
    </div>
</body>
</html>`;

        res.send(html);
    }

    sendSuccess(res, data) {
        res.json(data);
    }

    sendError(res, statusCode, message) {
        const errorResponse = {
            success: false,
            error: message,
            statusCode: statusCode,
            timestamp: new Date().toISOString()
        };

        res.status(statusCode).json(errorResponse);
    }

    stop() {
        if (this.server) {
            this.server.close(() => {
                console.log('🌐 Servidor web parado');
            });
        }
    }
}

module.exports = DiscordWebServer;