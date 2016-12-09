/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Sean Larkin @thelarkinn
 */
import path = require('path');

import EntrypointsOverSizeLimitWarning = require('./EntrypointsOverSizeLimitWarning');
import AssetsOverSizeLimitWarning = require('./AssetsOverSizeLimitWarning');
import NoAsyncChunksWarning = require('./NoAsyncChunksWarning');
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import { PerformanceOptions } from '../../typings/webpack-types'

class EmittedAssetSizeLimitPlugin {
    maxAssetSize?: number
    maxInitialSize?: number
    hints?
    errorOnHint?: boolean

    constructor(performanceOptions: PerformanceOptions) {
        this.maxAssetSize = performanceOptions.maxAssetSize;
        this.maxInitialSize = performanceOptions.maxInitialChunkSize;
        this.hints = performanceOptions.hints;
        this.errorOnHint = performanceOptions.errorOnHint;
    }

    apply(compiler: Compiler) {
        if (!this.hints) {
            return;
        }
        const entrypointSizeLimit = this.maxInitialSize;
        const sizeLimit = this.maxAssetSize;
        const hints = this.hints;
        const shouldErrorOnHint = this.errorOnHint;

        compiler.plugin('after-emit', (compilation: Compilation, callback) => {
            const warnings = [];

            const assetsOverSizeLimit: AssetsOverSizeLimitWarning.OverSizeLimit[] = [];

            Object.keys(compilation.assets).forEach(asset => {
                const obj = {
                    name: asset,
                    size: compilation.assets[asset].size()
                } as AssetsOverSizeLimitWarning.OverSizeLimit;

                if (doesExceedLimit(sizeLimit, obj.size)) {
                    obj.isOverSizeLimit = true;
                    assetsOverSizeLimit.push(obj);
                    compilation.assets[asset].isOverSizeLimit = true;
                }
            });

            const hasAsyncChunks = compilation.chunks.filter(chunk => !chunk.isInitial()).length > 0;

            const entrypointsOverLimit = Object.keys(compilation.entrypoints)
                .map(key => compilation.entrypoints[key])
                .filter(entry => doesExceedLimit(entrypointSizeLimit, entry.getSize(compilation)));

            // 1. Individual Chunk: Size < 250kb
            // 2. Collective Initial Chunks [entrypoint] (Each Set?): Size < 250kb
            // 3. No Async Chunks
            // if !1, then 2, if !2 return
            if (assetsOverSizeLimit.length > 0) {
                warnings.push(new AssetsOverSizeLimitWarning(assetsOverSizeLimit, sizeLimit));
            }
            if (entrypointsOverLimit.length > 0) {
                warnings.push(new EntrypointsOverSizeLimitWarning(entrypointsOverLimit, compilation, entrypointSizeLimit));
            }

            if (warnings.length > 0) {
                if (!hasAsyncChunks) {
                    warnings.push(new NoAsyncChunksWarning());
                }

                if (shouldErrorOnHint) {
                    Array.prototype.push.apply(compilation.errors, warnings);
                }
                else {
                    Array.prototype.push.apply(compilation.warnings, warnings);
                }
            }

            callback();
        });
    }
}

export = EmittedAssetSizeLimitPlugin;

// When using this we should always
// compare byte size and then format later
function doesExceedLimit(limit: number, actualSize: number) {
    return limit < actualSize;
}
