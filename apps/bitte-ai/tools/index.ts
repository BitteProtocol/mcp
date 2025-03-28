import { getTools as getGoatTools } from './goat-sdk';
import { getTools as getBaseAgentkitTools } from './base-agentkit';

export const services = {
    "goat": {
      name: "goat",
      tools: getGoatTools,
    },
    "agentkit": {
      name: "agentkit",
      tools: getBaseAgentkitTools,
    },
  }