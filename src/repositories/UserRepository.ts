import { prisma } from '../lib/prisma.js';

export const UserRepository = {
  async findByDiscordId(discordId: string) {
    return prisma.user.findUnique({ where: { discordId } });
  },

  async upsert(discordId: string, discordUsername: string) {
    return prisma.user.upsert({
      where: { discordId },
      update: { discordUsername },
      create: { discordId, discordUsername },
    });
  },
};
