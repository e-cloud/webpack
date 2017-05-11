/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Tapable = require('tapable');
import async = require('async');
import Stats = require('./Stats');
import Compiler = require('./Compiler')
import { AbstractStats, ErrCallback, WatchCallback, WatchOptions } from '../typings/webpack-types'
import MultiStats = require('./MultiStats')
import Watching = Compiler.Watching
import MultiWatching = require('./MultiWatching')

class MultiCompiler extends Tapable {
    constructor(public compilers: Compiler[]) {
        super();
        if (!Array.isArray(compilers)) {
            this.compilers = Object.keys(compilers).map(name => {
                compilers[name].name = name;
                return compilers[name];
            });
        }

        function delegateProperty(this: MultiCompiler, name: string) {
            Object.defineProperty(this, name, {
                configurable: false,
                get() {
                    throw new Error(`Cannot read ${name} of a MultiCompiler`);
                },
                set: (value: any) => {
                    this.compilers.forEach(compiler => {
                        compiler[name] = value;
                    });
                }
            });
        }

        delegateProperty.call(this, 'outputFileSystem');
        delegateProperty.call(this, 'inputFileSystem');

        Object.defineProperty(this, 'outputPath', {
            configurable: false,
            get() {
                let commonPath = compilers[0].outputPath;
                for (let i = 1; i < compilers.length; i++) {
                    while (compilers[i].outputPath.indexOf(commonPath) !== 0 && /[\/\\]/.test(commonPath)) {
                        commonPath = commonPath.replace(/[\/\\][^\/\\]*$/, '');
                    }
                }
                if (!commonPath && compilers[0].outputPath[0] === '/') {
                    return '/';
                }
                return commonPath;
            }
        });

        let doneCompilers = 0;
        const compilerStats: Stats[] = [];
        this.compilers.forEach((compiler: Compiler, idx) => {
            let compilerDone = false;
            compiler.plugin('done', (stats: Stats) => {
                if (!compilerDone) {
                    compilerDone = true;
                    doneCompilers++;
                }
                compilerStats[idx] = stats;
                if (doneCompilers === this.compilers.length) {
                    this.applyPlugins('done', new MultiStats(compilerStats));
                }
            });
            compiler.plugin('invalid', () => {
                if (compilerDone) {
                    compilerDone = false;
                    doneCompilers--;
                }
                this.applyPlugins('invalid');
            });
        });
    }

    watch(watchOptions: WatchOptions, handler: WatchCallback<AbstractStats>) {
        const watchings: Watching[] = [];
        const allStats = this.compilers.map(() => null);
        const compilerStatus: any[] = this.compilers.map(() => false);

        runWithDependencies(this.compilers, (compiler, callback) => {
            const compilerIdx = this.compilers.indexOf(compiler);
            let firstRun = true;
            const watching = compiler.watch(Array.isArray(watchOptions) ? watchOptions[compilerIdx] : watchOptions, function(err, stats) {
                if (err) {
                    handler(err);
                }
                if (stats) {
                    allStats[compilerIdx] = stats;
                    compilerStatus[compilerIdx] = 'new';
                    if (compilerStatus.every(Boolean)) {
                        const freshStats = allStats.filter(function (s, idx) {
                            return compilerStatus[idx] === 'new';
                        });
                        compilerStatus.fill(true);
                        const multiStats = new MultiStats(freshStats);
                        handler(null, multiStats);
                    }
                }
                if (firstRun && !err) {
                    firstRun = false;
                    callback();
                }
            });
            watchings.push(watching);
        }, () => {
            // ignore
        });

        return new MultiWatching(watchings, this);
    }

    run(callback: WatchCallback<AbstractStats>) {
        const allStats = this.compilers.map(() => null);

        runWithDependencies(this.compilers, (compiler, callback) => {
            const compilerIdx = this.compilers.indexOf(compiler);
            compiler.run((err: Error, stats: Stats) => {
                if (err) {
                    return callback(err);
                }
                allStats[compilerIdx] = stats;
                callback();
            });
        }, (err: Error) => {
            if (err) {
                return callback(err);
            }
            callback(null, new MultiStats(allStats));
        });
    }

    purgeInputFileSystem() {
        this.compilers.forEach(compiler => {
            if (compiler.inputFileSystem && compiler.inputFileSystem.purge) {
                compiler.inputFileSystem.purge();
            }
        });
    }

    static MultiWatching = MultiWatching
}

declare namespace MultiCompiler {}

export = MultiCompiler;

function runWithDependencies(
    compilers: Compiler[],
    fn: (compiler: Compiler, callback: ErrCallback) => any,
    callback: ErrCallback
) {
    const fulfilledNames = {};
    let remainingCompilers = compilers;

    function isDependencyFulfilled(d: string) {
        return fulfilledNames[d];
    }

    function getReadyCompilers() {
        const readyCompilers = [];
        const list = remainingCompilers;
        remainingCompilers = [];
        for (let i = 0; i < list.length; i++) {
            const c = list[i];
            const ready = !c.dependencies || c.dependencies.every(isDependencyFulfilled);
            if (ready) {
                readyCompilers.push(c);
            }
            else {
                remainingCompilers.push(c);
            }
        }
        return readyCompilers;
    }

    function runCompilers(callback: ErrCallback) {
        if (remainingCompilers.length === 0) {
            return callback();
        }
        async.map(getReadyCompilers(), (compiler, callback: (err: Error) => any) => {
            fn(compiler, (err: Error) => {
                if (err) {
                    return callback(err);
                }
                fulfilledNames[compiler.name] = true;
                runCompilers(callback);
            });
        }, callback);
    }

    runCompilers(callback);
}

