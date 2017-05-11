/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import Chunk = require('./Chunk')
import Module = require('./Module')

interface ProgressPluginHandler {
    (percentage: number, msg: string, ...details: string[]): void
}

class ProgressPlugin {
    profile: boolean;
    handler: ProgressPluginHandler;

    constructor(options: ProgressPluginHandler | {
        profile?: boolean
        handler: ProgressPluginHandler
    } = {} as any) {
        if (typeof options === 'function') {
            options = {
                handler: options
            };
        }
        this.profile = options.profile;
        this.handler = options.handler;
    }

    apply(compiler: Compiler) {
        const handler = this.handler || defaultHandler;
        const profile = this.profile;
        if (compiler.compilers) {
            const states = new Array(compiler.compilers.length);
            compiler.compilers.forEach((compiler: Compiler, idx: number) => {
                compiler.apply(new ProgressPlugin(function (p: number, msg: string, ...rest) {
                    states[idx] = Array.prototype.slice.apply(arguments);
                    handler(
                        states.map(state => state && state[0] || 0).reduce((a, b) => a + b) / states.length,
                        `[${idx}] ${msg}`,
                        ...rest
                    );
                }));
            });
        }
        else {
            let lastModulesCount = 0;
            let moduleCount = 500;
            let doneModules = 0;
            const activeModules: string[] = [];

            // todo: to be refactor
            const update = function update() {
                handler(
                    0.1 + doneModules / Math.max(lastModulesCount, moduleCount) * 0.6,
                    'building modules',
                    `${doneModules}/${moduleCount} modules`,
                    `${activeModules.length} active`,
                    activeModules[activeModules.length - 1]
                );
            };

            const moduleDone = function moduleDone(module: Module) {
                doneModules++;
                const ident = module.identifier();
                if (ident) {
                    const idx = activeModules.indexOf(ident);
                    if (idx >= 0) {
                        activeModules.splice(idx, 1);
                    }
                }
                update();
            };

            compiler.plugin('compilation', function (compilation: Compilation) {
                if (compilation.compiler.isChild()) {
                    return;
                }
                lastModulesCount = moduleCount;
                moduleCount = 0;
                doneModules = 0;
                handler(0, 'compiling');
                compilation.plugin('build-module', (module: Module) => {
                    moduleCount++;
                    const ident = module.identifier();
                    if (ident) {
                        activeModules.push(ident);
                    }
                    update();
                });
                compilation.plugin('failed-module', moduleDone);
                compilation.plugin('succeed-module', moduleDone);
                const syncHooks = {
                    'seal': [0.71, 'sealing'],
                    'optimize': [0.72, 'optimizing'],
                    'optimize-modules-basic': [0.73, 'basic module optimization'],
                    'optimize-modules': [0.74, 'module optimization'],
                    'optimize-modules-advanced': [0.75, 'advanced module optimization'],
                    'optimize-chunks-basic': [0.76, 'basic chunk optimization'],
                    'optimize-chunks': [0.77, 'chunk optimization'],
                    'optimize-chunks-advanced': [0.78, 'advanced chunk optimization'],
                    // optimize-tree
                    'revive-modules': [0.80, 'module reviving'],
                    'optimize-module-order': [0.81, 'module order optimization'],
                    'optimize-module-ids': [0.82, 'module id optimization'],
                    'revive-chunks': [0.83, 'chunk reviving'],
                    'optimize-chunk-order': [0.84, 'chunk order optimization'],
                    'optimize-chunk-ids': [0.85, 'chunk id optimization'],
                    'before-hash': [0.86, 'hashing'],
                    'before-module-assets': [0.87, 'module assets processing'],
                    'before-chunk-assets': [0.88, 'chunk assets processing'],
                    'additional-chunk-assets': [0.89, 'additional chunk assets processing'],
                    'record': [0.90, 'recording']
                };
                Object.keys(syncHooks).forEach(name => {
                    let pass = 0;
                    const settings = syncHooks[name];
                    compilation.plugin(name, function () {
                        if (pass++ > 0) {
                            handler(settings[0], settings[1], `pass ${pass}`);
                        }
                        else {
                            handler(settings[0], settings[1]);
                        }
                    });
                });
                compilation.plugin('optimize-tree', function (chunks: Chunk[], modules: Module[], callback) {
                    handler(0.79, 'module and chunk tree optimization');
                    callback();
                });
                compilation.plugin('additional-assets', function (callback) {
                    handler(0.91, 'additional asset processing');
                    callback();
                });
                compilation.plugin('optimize-chunk-assets', (chunks, callback) => {
                    handler(0.92, 'chunk asset optimization');
                    callback();
                });
                compilation.plugin('optimize-assets', function (assets, callback) {
                    handler(0.94, 'asset optimization');
                    callback();
                });
            });
            compiler.plugin('emit', (compilation: Compilation, callback) => {
                handler(0.95, 'emitting');
                callback();
            });
            compiler.plugin('done', function () {
                handler(1, '');
            });
        }

        let lineCaretPosition = 0;
        let lastState: string;
        let lastStateTime: number;

        function defaultHandler(percentage: number, msg: string, ...details: string[]) {
            let state = msg;
            if (percentage < 1) {
                percentage = Math.floor(percentage * 100);
                msg = `${percentage}% ${msg}`;
                if (percentage < 100) {
                    msg = ` ${msg}`;
                }
                if (percentage < 10) {
                    msg = ` ${msg}`;
                }
                details.forEach(detail => {
                    if (!detail) {
                        return;
                    }
                    if (detail.length > 40) {
                        detail = `...${detail.substr(detail.length - 37)}`;
                    }
                    msg += ` ${detail}`;
                });
            }
            if (profile) {
                state = state.replace(/^\d+\/\d+\s+/, '');
                if (percentage === 0) {
                    lastState = null;
                    lastStateTime = Date.now();
                }
                else if (state !== lastState || percentage === 1) {
                    const now = Date.now();
                    if (lastState) {
                        const stateMsg = `${now - lastStateTime}ms ${lastState}`;
                        goToLineStart(stateMsg);
                        process.stderr.write(`${stateMsg}\n`);
                        lineCaretPosition = 0;
                    }
                    lastState = state;
                    lastStateTime = now;
                }
            }
            goToLineStart(msg);
            process.stderr.write(msg);
        }

        function goToLineStart(nextMessage: string) {
            let str = '';
            for (; lineCaretPosition > nextMessage.length; lineCaretPosition--) {
                str += '\b \b';
            }
            for (let i = 0; i < lineCaretPosition; i++) {
                str += '\b';
            }
            lineCaretPosition = nextMessage.length;
            if (str) {
                process.stderr.write(str);
            }
        }
    }
}

export = ProgressPlugin;