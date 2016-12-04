/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Chunk = require('../Chunk')

class FlagIncludedChunksPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('optimize-chunk-ids', function (chunks: Chunk[]) {
                chunks.forEach(chunkA => {
                    chunks.forEach(chunkB => {
                        if (chunkA === chunkB) {
                            return;
                        }
                        // is chunkB in chunkA?
                        if (chunkA.modules.length < chunkB.modules.length) {
                            return;
                        }
                        for (let i = 0; i < chunkB.modules.length; i++) {
                            if (!chunkA.modules.includes(chunkB.modules[i])) {
                                return;
                            }
                        }
                        chunkA.ids.push(chunkB.id);
                    });
                });
            });
        });
    }
}

export = FlagIncludedChunksPlugin;
