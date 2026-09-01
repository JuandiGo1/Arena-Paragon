import { registerSelectHandler } from '../SelectHandler.js';
import { pendingStreakSets } from '../../../lib/pendingStreakSets.js';
import { ParticipantRepository } from '../../../repositories/ParticipantRepository.js';
import { logger } from '../../../utils/logger.js';

registerSelectHandler({
  customId: 'racha:select-event',
  async execute(interaction) {
    const participantId = interaction.values[0];
    const pending = pendingStreakSets.get(interaction.user.id);

    if (!pending) {
      await interaction.update({
        content: '❌ Sesión expirada. Vuelve a ejecutar `/racha`.',
        components: [],
      });
      return;
    }

    await interaction.deferUpdate();
    try {
      await ParticipantRepository.setStreak(participantId, pending.value);
      pendingStreakSets.clear(interaction.user.id);
      await interaction.editReply({
        content:
          `✅ Racha de <@${pending.targetDiscordId}> establecida a **${pending.value}** 🔥`,
        components: [],
      });
    } catch (err) {
      logger.error('Error en racha:select-event', err);
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      await interaction.editReply({ content: `❌ ${msg}`, components: [] });
    }
  },
});
