import type { ForgeConfig } from '@electron-forge/shared-types';
import { desktopConfig } from '../config';

const localSigning = {
  identity: '-',
  identityValidation: false,
  preAutoEntitlements: false,
  optionsForFile: () => ({
    hardenedRuntime: false,
    entitlements: ['com.apple.security.cs.allow-jit'],
    timestamp: 'none',
  }),
  continueOnError: false,
};

const forgeConfig: ForgeConfig = {
  packagerConfig: {
    name: desktopConfig.executableName,
    executableName: desktopConfig.executableName,
    appBundleId: desktopConfig.appId,
    asar: true,
    prune: false,
    osxSign: localSigning,
    ignore: [/^\/forge\.config\.cjs$/],
  },
  makers: [],
};

export default forgeConfig;
