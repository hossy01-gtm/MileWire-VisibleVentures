// https://docs.expo.dev/guides/customizing-metro/
const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;

/**
 * `config/testing.developer.json` is a local, gitignored file (it turns GPS
 * simulation on). Builds that do not have it (CI, EAS) get the tracked template,
 * which is disabled, so `require('.../config/testing.developer.json')` always resolves.
 */
const DEVELOPER_CONFIG = {
  segment: 'config/testing.developer.json',
  localPath: path.join(projectRoot, 'config/testing.developer.json'),
  templatePath: path.join(projectRoot, 'src/services/testing/templates/testing.developer.json'),
};

const config = getDefaultConfig(projectRoot);
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver = {
  ...config.resolver,
  // GPX files are bundled as assets (like images) and read at runtime by src/services/testing.
  assetExts: [...config.resolver.assetExts, 'gpx'],
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName.replace(/\\/g, '/').includes(DEVELOPER_CONFIG.segment)) {
      const filePath = fs.existsSync(DEVELOPER_CONFIG.localPath)
        ? DEVELOPER_CONFIG.localPath
        : DEVELOPER_CONFIG.templatePath;
      return { type: 'sourceFile', filePath };
    }
    return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
  },
};

module.exports = config;
