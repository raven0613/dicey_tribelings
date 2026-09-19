import { api as forge } from '@electron-forge/core';
import path from 'node:path';
import { desktopConfig } from '../config';
import { outputDirectory, prepareDesktopApp, stagingDirectory } from './prepare';

const targets = {
  win: { platform: 'win32', arch: 'x64' },
  mac: { platform: 'darwin', arch: 'universal' },
} as const;

async function main() {
  const target = process.argv[2];
  if (target !== 'win' && target !== 'mac' && target !== 'desktop') {
    throw new Error('請指定打包目標：win、mac 或 desktop。');
  }
  if (target !== 'win' && process.platform !== 'darwin') {
    throw new Error('macOS Universal 請於 macOS 執行 npm run package:mac 或 package:desktop。');
  }

  await prepareDesktopApp();
  const selectedTargets = target === 'desktop' ? [targets.win, targets.mac] : [targets[target]];
  for (const selected of selectedTargets) {
    console.log(`正在封裝 ${selected.platform} ${selected.arch}…`);
    await forge.package({ dir: stagingDirectory, outDir: outputDirectory, ...selected });
    console.log(`已完成：${path.join(outputDirectory,
      `${desktopConfig.executableName}-${selected.platform}-${selected.arch}`)}`);
  }
  console.log(`桌面應用程式已輸出至 ${outputDirectory}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
