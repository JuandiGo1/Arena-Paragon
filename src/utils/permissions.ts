import { PermissionsBitField, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { env } from '../config/env.js';

export function isAdmin(interaction: ChatInputCommandInteraction): boolean {
  if (!interaction.inGuild() || !interaction.member) return false;
  const perms = new PermissionsBitField(
    typeof interaction.member.permissions === 'string'
      ? BigInt(interaction.member.permissions)
      : interaction.member.permissions.bitfield,
  );
  if (perms.has(PermissionFlagsBits.Administrator)) return true;
  if (env.adminRoleIds.length === 0) return false;
  const roles: string[] = Array.isArray(interaction.member.roles)
    ? interaction.member.roles
    : [...interaction.member.roles.cache.keys()];
  return env.adminRoleIds.some((id) => roles.includes(id));
}
