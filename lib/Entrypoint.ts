/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Chunk = require('./Chunk')
import Compilation = require('./Compilation')

class Entrypoint {
    chunks: Chunk[]

    constructor(public name: string) {
        this.chunks = [];
    }

    unshiftChunk(chunk: Chunk) {
        this.chunks.unshift(chunk);
        chunk.entrypoints.push(this);
    }

    insertChunk(chunk: Chunk, before: Chunk) {
        const idx = this.chunks.indexOf(before);
        if (idx >= 0) {
            this.chunks.splice(idx, 0, chunk);
        }
        else {
            throw new Error('before chunk not found');
        }
        chunk.entrypoints.push(this);
    }

    getFiles() {
        const files: string[] = [];

        for (let chunk of this.chunks) {
            for (let file of chunk.files) {
                if (!files.includes(file)) {
                    files.push(file)
                }
            }
        }

        return files;
    }

    getSize(compilation: Compilation) {
        const files = this.getFiles();

        return files
            .map(file => compilation.assets[file].size())
            .reduce((currentSize, nextSize) => currentSize + nextSize, 0);
    }
}

export = Entrypoint;
