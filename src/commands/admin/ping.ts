import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../domain/Command.js';

const ping: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Comprueba si el bot responde.'),

  async execute(interaction) {
    const latency = interaction.client.ws.ping;
    await interaction.reply({ content: `Pong! 🏓 \`${latency}ms\``, ephemeral: true });
  },
};

export default ping;
