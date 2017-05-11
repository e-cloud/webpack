/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compilation = require('./Compilation')
import Compiler = require('./Compiler')
import Module = require('./Module')
import { Record } from '../typings/webpack-types';
import Chunk = require('./Chunk')
import { makePathsRelative } from './util/identifier';

class RecordIdsPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('record-modules', function (modules: Module[], records: Record) {
                if (!records.modules) {
                    records.modules = {} as any;
                }
                if (!records.modules.byIdentifier) {
                    records.modules.byIdentifier = {};
                }
                if (!records.modules.usedIds) {
                    records.modules.usedIds = {};
                }
                modules.forEach(module => {
                    if (!module.portableId) {
                        module.portableId = makePathsRelative(compiler.context, module.identifier());
                    }
                    const identifier = module.portableId;
                    records.modules.byIdentifier[identifier] = module.id;
                    records.modules.usedIds[module.id] = module.id;
                });
            });
            compilation.plugin('revive-modules', function (modules: Module[], records: Record) {
                if (!records.modules) {
                    return;
                }
                if (records.modules.byIdentifier) {
                    const usedIds = {};
                    modules.forEach(module => {
                        if (module.id !== null) {
                            return;
                        }
                        if (!module.portableId) {
                            module.portableId = makePathsRelative(compiler.context, module.identifier());
                        }
                        const identifier = module.portableId;
                        const id = records.modules.byIdentifier[identifier];
                        if (id === undefined) {
                            return;
                        }
                        if (usedIds[id]) {
                            return;
                        }
                        usedIds[id] = true;
                        module.id = id;
                    });
                }
                compilation.usedModuleIds = records.modules.usedIds;
            });

            function getDepBlockIdent(chunk: Chunk, block: Module) {
                const ident = [];
                if (block.chunks.length > 1) {
                    ident.push(block.chunks.indexOf(chunk));
                }
                while (block.parent) {
                    const p = block.parent;
                    const idx = p.blocks.indexOf(block);
                    const l = p.blocks.length - 1;
                    ident.unshift(`${idx}/${l}`);
                    block = block.parent;
                }
                if (!block.identifier) {
                    return null;
                }
                ident.unshift(makePathsRelative(compiler.context, block.identifier()));
                return ident.join(':');
            }

            compilation.plugin('record-chunks', (chunks: Chunk[], records: Record) => {
                records.nextFreeChunkId = compilation.nextFreeChunkId;
                if (!records.chunks) {
                    records.chunks = {} as any;
                }
                if (!records.chunks.byName) {
                    records.chunks.byName = {};
                }
                if (!records.chunks.byBlocks) {
                    records.chunks.byBlocks = {};
                }
                records.chunks.usedIds = {};
                chunks.forEach(chunk => {
                    const name = chunk.name;
                    const blockIdents = chunk.blocks.map(getDepBlockIdent.bind(null, chunk))
                        .filter(Boolean) as string[];
                    if (name) {
                        records.chunks.byName[name] = chunk.id;
                    }
                    blockIdents.forEach(blockIdent => {
                        records.chunks.byBlocks[blockIdent] = chunk.id;
                    });
                    records.chunks.usedIds[chunk.id] = chunk.id;
                });
            });
            compilation.plugin('revive-chunks', function (chunks: Chunk[], records: Record) {
                if (!records.chunks) {
                    return;
                }
                const usedIds = {};
                if (records.chunks.byName) {
                    chunks.forEach(chunk => {
                        if (chunk.id !== null) {
                            return;
                        }
                        if (!chunk.name) {
                            return;
                        }
                        const id = records.chunks.byName[chunk.name];
                        if (id === undefined) {
                            return;
                        }
                        if (usedIds[id]) {
                            return;
                        }
                        usedIds[id] = true;
                        chunk.id = id;
                    });
                }
                if (records.chunks.byBlocks) {
                    const argumentedChunks = chunks.filter(chunk => chunk.id === null)
                        .map(chunk => ({
                            chunk,
                            blockIdents: chunk.blocks.map(getDepBlockIdent.bind(null, chunk))
                                .filter(Boolean) as string[]
                        }))
                        .filter(arg => arg.blockIdents.length > 0);

                    const blockIdentsCount = {};

                    argumentedChunks.forEach((arg, idx) => {
                        arg.blockIdents.forEach(blockIdent => {
                            const id = records.chunks.byBlocks[blockIdent];
                            if (typeof id !== 'number') {
                                return;
                            }
                            const accessor = `${id}:${idx}`;
                            blockIdentsCount[accessor] = (blockIdentsCount[accessor] || 0) + 1;
                        });
                    });

                    const blockIdentsSortedCount = Object.keys(blockIdentsCount)
                        .map(accessor => [blockIdentsCount[accessor]].concat(accessor.split(':').map(Number)))
                        .sort((a, b) => b[0] - a[0]);

                    blockIdentsSortedCount.forEach(arg => {
                        const id = arg[1];
                        if (usedIds[id]) {
                            return;
                        }
                        const idx = arg[2];
                        const chunk = argumentedChunks[idx].chunk;
                        if (chunk.id !== null) {
                            return;
                        }
                        usedIds[id] = true;
                        chunk.id = id;
                    });
                }
                compilation.usedChunkIds = records.chunks.usedIds;
            });
        });
    }
}

export = RecordIdsPlugin;
