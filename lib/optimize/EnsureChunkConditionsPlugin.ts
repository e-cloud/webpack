/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class EnsureChunkConditionsPlugin {
    apply(compiler) {
        compiler.plugin('compilation', function (compilation) {
            compilation.plugin(['optimize-chunks-basic', 'optimize-extracted-chunks-basic'], function (chunks) {
                let changed = false;
                chunks.forEach(function (chunk) {
                    chunk.modules.slice().forEach(function (module) {
                        if (!module.chunkCondition) {
                            return;
                        }
                        if (!module.chunkCondition(chunk)) {
                            const usedChunks = module._EnsureChunkConditionsPlugin_usedChunks = (module._EnsureChunkConditionsPlugin_usedChunks || []).concat(chunk);
                            const newChunks = [];
                            chunk.parents.forEach(function (parent) {
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
