import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.nikkeilogistica.garagem26',
  appName: 'Garagem 26',
  webDir: 'www',
  server: {
    url: 'https://takahashinikkei.github.io/consulta-fipe/?app=1',
    cleartext: false
  }
};

export default config;
