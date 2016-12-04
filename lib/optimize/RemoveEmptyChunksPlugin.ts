/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Chunk = require('../Chunk')

class RemoveEmptyChunksPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin(['optimize-chunks-basic', 'optimize-extracted-chunks-basic'], (chunks: Chunk[]) => {
                chunks.filter(chunk => chunk.isEmpty() && !chunk.hasRuntime() && !chunk.hasEntryModule())
                    .forEach(chunk => {
                        chunk.remove('empty');
                        chunks.splice(chunks.indexOf(chunk), 1);
                    });
            });
        });
    }
}

export = RemoveEmptyChunksPlugin;
