/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class OccurrenceOrderPlugin {
    constructor(preferEntry) {
        if (preferEntry !== undefined && typeof preferEntry !== 'boolean') {
            throw new Error('Argument should be a boolean.\nFor more info on this plugin, see https://webpack.github.io/docs/list-of-plugins.html');
        }
        this.preferEntry = preferEntry;
    }

    apply(compiler) {
        const preferEntry = this.preferEntry;
        compiler.plugin('compilation', function (compilation) {
            compilation.plugin('optimize-module-order', function (modules) {
                function entryChunks(m) {
                    return m.chunks.map(function (c) {
                        const sum = (c.isInitial() ? 1 : 0) + (c.entryModule === m ? 1 : 0);
                        return sum;
                    }).reduce(function (a, b) {
                        return a + b;
                    }, 0);
                }

                function occursInEntry(m) {
                    return m.reasons.map(function (r) {
                            if (!r.module) {
                                return 0;
                            }
                            return entryChunks(r.module);
                        }).reduce(function (a, b) {
                            return a + b;
                        }, 0) + entryChunks(m);
                }

                function occurs(m) {
                    return m.reasons.map(function (r) {
                            if (!r.module) {
                                return 0;
                            }
                            return r.module.chunks.length;
                        }).reduce(function (a, b) {
                            return a + b;
                        }, 0) + m.chunks.length + m.chunks.filter(function (c) {
                            c.entryModule === m;
                        }).length;
                }

                modules.sort(function (a, b) {
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
            compilation.plugin('optimize-chunk-order', function (chunks) {
                function occursInEntry(c) {
                    return c.parents.filter(function (p) {
                        return p.isInitial();
                    }).length;
                }

                function occurs(c) {
                    return c.blocks.length;
                }

                chunks.forEach(function (c) {
                    c.modules.sort(function (a, b) {
                        if (a.identifier() > b.identifier()) {
                            return 1;
                        }
                        if (a.identifier() < b.identifier()) {
                            return -1;
                        }
                        return 0;
                    });
                });
                chunks.sort(function (a, b) {
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
