export const config = {
  bitteRegistryUrl: process.env.BITTE_REGISTRY_URL || 'https://registry.bitte.ai',
  bitteRuntimeUrl:
    process.env.BITTE_RUNTIME_URL || 'https://ai-runtime-446257178793.europe-west1.run.app',
  bitteApiKey: process.env.BITTE_API_KEY || 'your_api_key_here',
  extraToolsApiKey: process.env.EXTRA_TOOLS_API_KEY || 'your_api_key_here',
};
