/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compilation = require('../Compilation')
import Compiler = require('../Compiler')
import Chunk = require('../Chunk')
import ExternalModule = require('../ExternalModule')

class EnsureChunkConditionsPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin([
                'optimize-chunks-basic',
                'optimize-extracted-chunks-basic'
            ], function (chunks: Chunk[]) {
                let changed = false;
                chunks.forEach(chunk => {
                    chunk.modules.slice().forEach((module: ExternalModule) => {
                        if (!module.chunkCondition) {
                            return;
                        }
                        if (!module.chunkCondition(chunk)) {
                            const usedChunks = module._EnsureChunkConditionsPlugin_usedChunks = (module._EnsureChunkConditionsPlugin_usedChunks || []).concat(chunk);
                            const newChunks: Chunk[] = [];
                            chunk.parents.forEach(parent => {
                                if (!usedChunks.includes(parent)) {
                                    parent.addModule(module);
                                    newChunks.push(parent);
                                }
                            });
                            module.rewriteChunkInReasons(chunk, newChunks);
                            chunk.removeModule(module);
                            changed = true;
                        }
                    });
                });
                if (changed) {
                    return true;
                }
            });
        });
    }
}

export = EnsureChunkConditionsPlugin;
