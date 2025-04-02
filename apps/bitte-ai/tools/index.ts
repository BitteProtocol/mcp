import { getTools as getBaseAgentkitTools } from './base-agentkit';
import { getTools as getGoatTools } from './goat-sdk';

export const services = {
  goat: {
    name: 'goat',
    tools: getGoatTools,
  },
  agentkit: {
    name: 'agentkit',
    tools: getBaseAgentkitTools,
  },
};
