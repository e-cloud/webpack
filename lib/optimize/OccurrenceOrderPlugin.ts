/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compilation = require('../Compilation')
import Compiler = require('../Compiler')
class OccurrenceOrderPlugin {
    constructor(public preferEntry: boolean) {
        if (preferEntry !== undefined && typeof preferEntry !== 'boolean') {
            throw new Error('Argument should be a boolean.\nFor more info on this plugin, see https://webpack.github.io/docs/list-of-plugins.html');
        }
    }

    apply(compiler: Compiler) {
        const preferEntry = this.preferEntry;
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('optimize-module-order', function (modules) {
                function entryChunks(m) {
                    return m.chunks.map(c => {
                        const sum = (c.isInitial() ? 1 : 0) + (c.entryModule === m ? 1 : 0);
                        return sum;
                    }).reduce((a, b) => a + b, 0);
                }

                function occursInEntry(m) {
                    return m.reasons.map(r => {
                            if (!r.module) {
                                return 0;
                            }
                            return entryChunks(r.module);
                        }).reduce((a, b) => a + b, 0) + entryChunks(m);
                }

                function occurs(m) {
                    return m.reasons.map(r => {
                            if (!r.module) {
                                return 0;
                            }
                            return r.module.chunks.length;
                        }).reduce((a, b) => a + b, 0) + m.chunks.length + m.chunks.filter(c => {
                            // todo: what?
                            c.entryModule === m;
                        }).length;
                }

                modules.sort((a, b) => {
                    if (preferEntry) {
                        const aEntryOccurs = occursInEntry(a);
                        const bEntryOccurs = occursInEntry(b);
                        if (aEntryOccurs > bEntryOccurs) {
                            return -1;
                        }
                        if (aEntryOccurs < bEntryOccurs) {
                            return 1;
                        }
                    }
                    const aOccurs = occurs(a);
                    const bOccurs = occurs(b);
                    if (aOccurs > bOccurs) {
                        return -1;
                    }
                    if (aOccurs < bOccurs) {
                        return 1;
                    }
                    if (a.identifier() > b.identifier()) {
                        return 1;
                    }
                    if (a.identifier() < b.identifier()) {
                        return -1;
                    }
                    return 0;
                });
            });
            compilation.plugin('optimize-chunk-order', chunks => {
                function occursInEntry(c) {
                    return c.parents
                        .filter(p => p.isInitial())
                        .length;
                }

                function occurs(c) {
                    return c.blocks.length;
                }

                chunks.forEach(c => {
                    c.modules.sort((a, b) => {
                        if (a.identifier() > b.identifier()) {
                            return 1;
                        }
                        if (a.identifier() < b.identifier()) {
                            return -1;
                        }
                        return 0;
                    });
                });
                chunks.sort((a, b) => {
                    const aEntryOccurs = occursInEntry(a);
                    const bEntryOccurs = occursInEntry(b);
                    if (aEntryOccurs > bEntryOccurs) {
                        return -1;
                    }
                    if (aEntryOccurs < bEntryOccurs) {
                        return 1;
                    }
                    const aOccurs = occurs(a);
                    const bOccurs = occurs(b);
                    if (aOccurs > bOccurs) {
                        return -1;
                    }
                    if (aOccurs < bOccurs) {
                        return 1;
                    }
                    if (a.modules.length > b.modules.length) {
                        return -1;
                    }
                    if (a.modules.length < b.modules.length) {
                        return 1;
                    }
                    for (let i = 0; i < a.modules.length; i++) {
                        if (a.modules[i].identifier() > b.modules[i].identifier()) {
                            return -1;
                        }
                        if (a.modules[i].identifier() < b.modules[i].identifier()) {
                            return 1;
                        }
                    }
                    return 0;
                });
            });
        });
    }
}

export = OccurrenceOrderPlugin;
