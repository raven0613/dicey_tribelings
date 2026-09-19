import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as buildScript } from 'esbuild';
import { build as buildWeb } from 'vite';
import { desktopConfig } from '../config';

export const projectDirectory = fileURLToPath(new URL('../../', import.meta.url));
export const stagingDirectory = path.join(projectDirectory, 'build/desktop/app');
export const outputDirectory = path.join(projectDirectory, 'out');

interface ProjectManifest {
  version: string;
  devDependencies: { electron: string };
}

export async function prepareDesktopApp() {
  const manifest: ProjectManifest = JSON.parse(await readFile(path.join(projectDirectory, 'package.json'), 'utf8'));
  await mkdir(path.join(stagingDirectory, 'node_modules'), { recursive: true });
  await buildWeb({
    root: projectDirectory,
    configFile: path.join(projectDirectory, 'vite.config.ts'),
    base: '/',
    build: { outDir: path.join(stagingDirectory, 'web'), emptyOutDir: true },
  });

  await buildScript({
    absWorkingDir: projectDirectory,
    entryPoints: {
      main: 'desktop/main.ts',
      'forge.config': 'desktop/packaging/forge.config.ts',
    },
    outdir: stagingDirectory,
    outExtension: { '.js': '.cjs' },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['electron'],
  });

  await writeFile(path.join(stagingDirectory, 'package.json'), JSON.stringify({
    name: desktopConfig.packageName,
    productName: desktopConfig.title,
    version: manifest.version,
    private: true,
    main: 'main.cjs',
    config: { forge: './forge.config.cjs' },
    devDependencies: { electron: manifest.devDependencies.electron },
  }, null, 2) + '\n');
}
