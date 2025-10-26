const { REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Carregar todos os comandos
for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Comando preparado: ${command.data.name}`);
    } else {
        console.log(`⚠️ Comando em ${file} está faltando "data" ou "execute"`);
    }
}

// Construir e preparar REST module
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Deploy dos comandos
(async () => {
    try {
        console.log(`🔄 Registrando ${commands.length} comandos slash...`);

        // Registrar comandos no servidor específico (desenvolvimento)
        if (process.env.GUILD_ID) {
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log(`✅ ${data.length} comandos registrados no servidor!`);
        } else {
            // Registrar comandos globalmente (produção)
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`✅ ${data.length} comandos registrados globalmente!`);
        }
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
})();
