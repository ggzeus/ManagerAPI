const { Client, GatewayIntentBits, Collection, Events, ActivityType, MessageFlags } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
const DiscordWebServer = require('./utils/webserver');
require('dotenv').config();

const settings = require('./settings.json');

// Criar cliente do Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});

// Coleções para comandos
client.commands = new Collection();
client.settings = settings;

// Carregar comandos
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Comando carregado: ${command.data.name}`);
    } else {
        console.log(`⚠️ Comando em ${file} está faltando "data" ou "execute"`);
    }
}

// Carregar eventos
const eventsPath = join(__dirname, 'events');
try {
    const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        console.log(`✅ Evento carregado: ${event.name}`);
    }
} catch (error) {
    console.log('⚠️ Pasta de eventos não encontrada ou vazia');
}

// Quando o bot estiver pronto
client.once(Events.ClientReady, () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
    console.log(`📊 Servidores: ${client.guilds.cache.size}`);
    console.log(`👥 Usuários: ${client.users.cache.size}`);
    
    // Status do bot
    client.user.setActivity('Gerenciando clientes', { type: ActivityType.Watching });
    
    // Iniciar servidor web
    const webServer = new DiscordWebServer(client);
    webServer.start();
    
    // Verificação periódica de licenças
    const checkInterval = settings.licenseSettings.checkInterval || 3600000; // 1 hora
    setInterval(() => {
        console.log('🔄 Verificando licenças...');
        // Implementar verificação automática aqui
    }, checkInterval);
});

// Login do bot
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Erro ao fazer login:', error);
    process.exit(1);
});

// Tratamento de erros
process.on('unhandledRejection', (error) => {
    console.error('❌ Erro não tratado:', error);
    // Não encerrar o processo para evitar crash do bot
});

process.on('uncaughtException', (error) => {
    console.error('❌ Exceção não capturada:', error);
    // Não encerrar o processo para evitar crash do bot
});

// Tratamento específico para erros do Discord
client.on('error', (error) => {
    console.error('❌ Erro do cliente Discord:', error);
});

client.on('warn', (warning) => {
    console.warn('⚠️ Aviso do Discord:', warning);
});

module.exports = client;
