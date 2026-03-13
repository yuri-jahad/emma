import type { Channel, TextBasedChannel } from 'discord.js';

export const isTextChannel = (channel: Channel): channel is TextBasedChannel => {
  return 'sendTyping' in channel && 'send' in channel;
};
