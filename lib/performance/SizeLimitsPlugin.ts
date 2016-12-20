/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Sean Larkin @thelarkinn
 */

import EntrypointsOverSizeLimitWarning = require('./EntrypointsOverSizeLimitWarning');
import AssetsOverSizeLimitWarning  = require ('./AssetsOverSizeLimitWarning');
import NoAsyncChunksWarning  = require( './NoAsyncChunksWarning');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import { PerformanceOptions } from '../../typings/webpack-types'
import Entrypoint = require('../Entrypoint')

class SizeLimitsPlugin {
    maxAssetSize?: number
    maxInitialSize?: number
    hints?: string | boolean
    errorOnHint?: boolean
    maxEntrypointSize: number
    assetFilter: (asset: string) => boolean

    constructor(options: PerformanceOptions) {
        this.hints = options.hints;
        this.maxAssetSize = options.maxAssetSize;
        this.maxEntrypointSize = options.maxEntrypointSize;
        this.assetFilter = options.assetFilter;
    }

    apply(compiler: Compiler) {
        const entrypointSizeLimit = this.maxEntrypointSize;
        const assetSizeLimit = this.maxAssetSize;
        const hints = this.hints;
        const assetFilter = this.assetFilter || ((asset: string) => !/\.map$/.test(asset));

        compiler.plugin('after-emit', (compilation: Compilation, callback) => {
            const warnings = [];

            const getEntrypointSize = (entrypoint: Entrypoint) => {
                const files = entrypoint.getFiles();

                return files.filter(assetFilter)
                    .map(file => compilation.assets[file].size())
                    .reduce((currentSize, nextSize) => currentSize + nextSize, 0);
            };

            const assetsOverSizeLimit: AssetsOverSizeLimitWarning.OverSizeLimit[] = [];
            Object.keys(compilation.assets).filter(assetFilter).forEach(assetName => {
                const asset = compilation.assets[assetName];
                const size = asset.size();

                if (size > assetSizeLimit) {
                    assetsOverSizeLimit.push({
                        name: assetName,
                        size
                    });
                    asset.isOverSizeLimit = true;
                }
            });

            const entrypointsOverLimit: EntrypointsOverSizeLimitWarning.OverSizeLimit[] = [];
            Object.keys(compilation.entrypoints).forEach(key => {
                const entry = compilation.entrypoints[key];
                const size = getEntrypointSize(entry);

                if (size > entrypointSizeLimit) {
                    entrypointsOverLimit.push({
                        name: key,
                        size,
                        files: entry.getFiles().filter(assetFilter)
                    });
                    entry.isOverSizeLimit = true;
                }
            });

            if (hints) {
                // 1. Individual Chunk: Size < 250kb
                // 2. Collective Initial Chunks [entrypoint] (Each Set?): Size < 250kb
                // 3. No Async Chunks
                // if !1, then 2, if !2 return
                if (assetsOverSizeLimit.length > 0) {
                    warnings.push(new AssetsOverSizeLimitWarning(assetsOverSizeLimit, assetSizeLimit));
                }
                if (entrypointsOverLimit.length > 0) {
                    warnings.push(new EntrypointsOverSizeLimitWarning(entrypointsOverLimit, entrypointSizeLimit));
                }

                if (warnings.length > 0) {
                    const hasAsyncChunks = compilation.chunks.filter(chunk => !chunk.isInitial()).length > 0;

                    if (!hasAsyncChunks) {
                        warnings.push(new NoAsyncChunksWarning());
                    }

                    if (hints === 'error') {
                        Array.prototype.push.apply(compilation.errors, warnings);
                    }
                    else {
                        Array.prototype.push.apply(compilation.warnings, warnings);
                    }
                }
            }

            callback();
        });
    }
}

export = SizeLimitsPlugin;
