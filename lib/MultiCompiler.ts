/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Tapable = require('tapable');
import async = require('async');
import Stats = require('./Stats');

class MultiWatching {
    constructor(watchings) {
        this.watchings = watchings;
    }

    invalidate() {
        this.watchings.forEach(watching => {
            watching.invalidate();
        });
    }

    close(callback) {
        async.forEach(this.watchings, (watching, callback) => {
            watching.close(callback);
        }, callback);
    }
}

class MultiCompiler extends Tapable {
    constructor(compilers) {
        super();
        if (!Array.isArray(compilers)) {
            compilers = Object.keys(compilers).map(name => {
                compilers[name].name = name;
                return compilers[name];
            });
        }
        this.compilers = compilers;

        function delegateProperty(name) {
            Object.defineProperty(this, name, {
                configurable: false,
                get() {
                    throw new Error(`Cannot read ${name} of a MultiCompiler`);
                },
                set: value => {
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
        const compilerStats = [];
        this.compilers.forEach(function (compiler, idx) {
            let compilerDone = false;
            compiler.plugin('done', stats => {
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
        }, this);
    }

    watch(watchOptions, handler) {
        const watchings = [];
        const allStats = this.compilers.map(() => null);
        const compilerStatus = this.compilers.map(() => false);

        runWithDependencies(this.compilers, (compiler, callback) => {
            const compilerIdx = this.compilers.indexOf(compiler);
            let firstRun = true;
            const watching = compiler.watch(watchOptions, (err, stats) => {
                if (err) {
                    handler(err);
                }
                if (stats) {
                    allStats[compilerIdx] = stats;
                    compilerStatus[compilerIdx] = true;
                    if (compilerStatus.every(Boolean)) {
                        const multiStats = new MultiStats(allStats);
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

        return new MultiWatching(watchings);
    }

    run(callback) {
        const allStats = this.compilers.map(() => null);

        runWithDependencies(this.compilers, (compiler, callback) => {
            const compilerIdx = this.compilers.indexOf(compiler);
            compiler.run((err, stats) => {
                if (err) {
                    return callback(err);
                }
                allStats[compilerIdx] = stats;
                callback();
            });
        }, err => {
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
}

export = MultiCompiler;

function runWithDependencies(compilers, fn, callback) {
    const fulfilledNames = {};
    let remainingCompilers = compilers;

    function isDependencyFulfilled(d) {
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

    function runCompilers(callback) {
        if (remainingCompilers.length === 0) {
            return callback();
        }
        async.map(getReadyCompilers(), (compiler, callback) => {
            fn(compiler, err => {
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

class MultiStats {
    constructor(stats) {
        this.stats = stats;
        this.hash = stats.map(stat => stat.hash).join('');
    }

    hasErrors() {
        return this.stats
            .map(stat => stat.hasErrors())
            .reduce((a, b) => a || b, false);
    }

    hasWarnings() {
        return this.stats
            .map(stat => stat.hasWarnings())
            .reduce((a, b) => a || b, false);
    }

    toJson(options, forToString) {
        const jsons = this.stats.map(stat => {
            const obj = stat.toJson(options, forToString);
            obj.name = stat.compilation && stat.compilation.name;
            return obj;
        });
        const obj: any = {
            errors: jsons.reduce((arr, j) =>
                    arr.concat(j.errors.map(msg => `(${j.name}) ${msg}`))
                , []),
            warnings: jsons.reduce((arr, j) =>
                    arr.concat(j.warnings.map(msg => `(${j.name}) ${msg}`))
                , [])
        };
        if (!options || options.version !== false) {
            obj.version = require('../package.json').version;
        }
        if (!options || options.hash !== false) {
            obj.hash = this.hash;
        }
        if (!options || options.children !== false) {
            obj.children = jsons;
        }
        return obj;
    }
}

MultiStats.prototype.toString = Stats.prototype.toString;
