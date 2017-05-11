/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
'use strict';
import Chunk = require('./Chunk');
import Compiler = require('./Compiler');
import Compilation = require('./Compilation');

type NameResolver = (chunk: Chunk) => string | null

class NamedChunksPlugin {
    nameResolver: NameResolver;

    static defaultNameResolver(chunk: Chunk) {
        return chunk.name || null;
    }

    constructor(nameResolver: NameResolver) {
        this.nameResolver = nameResolver || NamedChunksPlugin.defaultNameResolver;
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', (compilation: Compilation) => {
            compilation.plugin('before-chunk-ids', (chunks: Chunk[]) => {
                chunks.forEach(chunk => {
                    if (chunk.id === null) {
                        chunk.id = this.nameResolver(chunk);
                    }
                });
            });
        });
    }
}

export = NamedChunksPlugin
