/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')

class MergeDuplicateChunksPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('optimize-chunks-basic', function (chunks) {
                const map = {};
                chunks.slice().forEach(chunk => {
                    if (chunk.hasRuntime() || chunk.hasEntryModule()) {
                        return;
                    }
                    const ident = getChunkIdentifier(chunk);
                    if (map[ident]) {
                        if (map[ident].integrate(chunk, 'duplicate')) {
                            chunks.splice(chunks.indexOf(chunk), 1);
                        }
                        return;
                    }
                    map[ident] = chunk;
                });
            });
        });
    }
}

export = MergeDuplicateChunksPlugin;

function getChunkIdentifier(chunk) {
    return chunk.modules
        .map(m => m.identifier())
        .sort()
        .join(', ');
}
