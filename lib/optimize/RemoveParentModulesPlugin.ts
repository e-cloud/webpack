/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Chunk = require('../Chunk')
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Module = require('../Module')

function chunkContainsModule(chunk: Chunk, module: Module) {
    const chunks = module.chunks;
    const modules = chunk.modules;
    if (chunks.length < modules.length) {
        return chunks.includes(chunk);
    }
    else {
        return modules.includes(module);
    }
}

function hasModule(chunk: Chunk, module: Module, checkedChunks: Chunk[]): false | Chunk[] {
    if (chunkContainsModule(chunk, module)) {
        return [chunk];
    }
    if (chunk.parents.length === 0) {
        return false;
    }
    return allHaveModule(chunk.parents.filter(c => !checkedChunks.includes(c)), module, checkedChunks);
}

function allHaveModule(someChunks: Chunk[], module: Module, checkedChunks: Chunk[] = []): false | Chunk[] {
    const chunks: Chunk[] = [];
    for (let i = 0; i < someChunks.length; i++) {
        checkedChunks.push(someChunks[i]);
        const subChunks = hasModule(someChunks[i], module, checkedChunks);
        if (!subChunks) {
            return false;
        }
        for (let index = 0; index < subChunks.length; index++) {
            const item = subChunks[index];

            if (!chunks.length || chunks.indexOf(item) < 0) {
                chunks.push(item);
            }
        }
    }
    return chunks;
}

function debugIds(chunks: Chunk[]) {
    const list = [];
    for (let i = 0; i < chunks.length; i++) {
        const debugId = chunks[i].debugId;

        if (typeof debugId !== 'number') {
            return 'no';
        }

        list.push(debugId);
    }
    list.sort();
    return list.join(',');
}

class RemoveParentModulesPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin(['optimize-chunks-basic', 'optimize-extracted-chunks-basic'], (chunks: Chunk[]) => {
                for (let index = 0; index < chunks.length; index++) {
                    const chunk = chunks[index];
                    if (chunk.parents.length === 0) continue;

                    // TODO consider Map when performance has improved
                    // https://gist.github.com/sokra/b36098368da7b8f6792fd7c85fca6311
                    const cache = Object.create(null);
                    const modules = chunk.modules.slice();
                    for (let i = 0; i < modules.length; i++) {
                        const module = modules[i];

                        const dId = debugIds(module.chunks);
                        let parentChunksWithModule;

                        if ((dId in cache) && dId !== 'no') {
                            parentChunksWithModule = cache[dId];
                        }
                        else {
                            parentChunksWithModule = cache[dId] = allHaveModule(chunk.parents, module);
                        }

                        if (parentChunksWithModule) {
                            module.rewriteChunkInReasons(chunk, parentChunksWithModule);
                            chunk.removeModule(module);
                        }
                    }
                }
            });
        });
    }
}

export = RemoveParentModulesPlugin;
