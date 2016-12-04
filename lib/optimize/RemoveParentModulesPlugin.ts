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

function hasModule(chunk: Chunk, module: Module, checkedChunks: Chunk[]): boolean | Chunk[] {
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
        addToSet(chunks, subChunks as Chunk[]);
    }
    return chunks;
}

function addToSet(set: any[], items: any[]) {
    items.forEach(item => {
        if (!set.includes(item)) {
            set.push(item);
        }
    });
}

function debugIds(chunks: Chunk[]) {
    const list = chunks.map(chunk => chunk.debugId);
    const debugIdMissing = list.some(dId => typeof dId !== 'number');
    if (debugIdMissing) {
        return 'no';
    }
    list.sort();
    return list.join(',');
}

class RemoveParentModulesPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin(['optimize-chunks-basic', 'optimize-extracted-chunks-basic'], (chunks: Chunk[]) => {
                chunks.forEach(chunk => {
                    const cache = {};
                    chunk.modules.slice().forEach(module => {
                        if (chunk.parents.length === 0) {
                            return;
                        }
                        const dId = `$${debugIds(module.chunks)}`;
                        let parentChunksWithModule;
                        if (dId in cache && dId !== '$no') {
                            parentChunksWithModule = cache[dId];
                        }
                        else {
                            parentChunksWithModule = cache[dId] = allHaveModule(chunk.parents, module);
                        }
                        if (parentChunksWithModule) {
                            module.rewriteChunkInReasons(chunk, parentChunksWithModule);
                            chunk.removeModule(module);
                        }
                    });
                });
            });
        });
    }
}

export = RemoveParentModulesPlugin;
