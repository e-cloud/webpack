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
        this.watchings.forEach(function (watching) {
            watching.invalidate();
        });
    }

    close(callback) {
        async.forEach(this.watchings, function (watching, callback) {
            watching.close(callback);
        }, callback);
    }
}

class MultiCompiler extends Tapable {
    constructor(compilers) {
        super();
        if (!Array.isArray(compilers)) {
            compilers = Object.keys(compilers).map(function (name) {
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
                set: function (value) {
                    this.compilers.forEach(function (compiler) {
                        compiler[name] = value;
                    });
                }.bind(this)
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
            compiler.plugin('done', function (stats) {
                if (!compilerDone) {
                    compilerDone = true;
                    doneCompilers++;
                }
                compilerStats[idx] = stats;
                if (doneCompilers === this.compilers.length) {
                    this.applyPlugins('done', new MultiStats(compilerStats));
                }
            }.bind(this));
            compiler.plugin('invalid', function () {
                if (compilerDone) {
                    compilerDone = false;
                    doneCompilers--;
                }
                this.applyPlugins('invalid');
            }.bind(this));
        }, this);
    }

    watch(watchOptions, handler) {
        const watchings = [];
        const allStats = this.compilers.map(function () {
            return null;
        });
        const compilerStatus = this.compilers.map(function () {
            return false;
        });

        runWithDependencies(this.compilers, function (compiler, callback) {
            const compilerIdx = this.compilers.indexOf(compiler);
            let firstRun = true;
            const watching = compiler.watch(watchOptions, function (err, stats) {
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
        }.bind(this), function () {
            // ignore
        });

        return new MultiWatching(watchings);
    }

    run(callback) {
        const allStats = this.compilers.map(function () {
            return null;
        });

        runWithDependencies(this.compilers, function (compiler, callback) {
            const compilerIdx = this.compilers.indexOf(compiler);
            compiler.run(function (err, stats) {
                if (err) {
                    return callback(err);
                }
                allStats[compilerIdx] = stats;
                callback();
            });
        }.bind(this), function (err) {
            if (err) {
                return callback(err);
            }
            callback(null, new MultiStats(allStats));
        });
    }

    purgeInputFileSystem() {
        this.compilers.forEach(function (compiler) {
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
        async.map(getReadyCompilers(), function (compiler, callback) {
            fn(compiler, function (err) {
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
        this.hash = stats.map(function (stat) {
            return stat.hash;
        }).join('');
    }

    hasErrors() {
        return this.stats.map(function (stat) {
            return stat.hasErrors();
        }).reduce(function (a, b) {
            return a || b;
        }, false);
    }

    hasWarnings() {
        return this.stats.map(function (stat) {
            return stat.hasWarnings();
        }).reduce(function (a, b) {
            return a || b;
        }, false);
    }

    toJson(options, forToString) {
        const jsons = this.stats.map(function (stat) {
            const obj = stat.toJson(options, forToString);
            obj.name = stat.compilation && stat.compilation.name;
            return obj;
        });
        const obj = {
            errors: jsons.reduce(function (arr, j) {
                return arr.concat(j.errors.map(function (msg) {
                    return `(${j.name}) ${msg}`;
                }));
            }, []),
            warnings: jsons.reduce(function (arr, j) {
                return arr.concat(j.warnings.map(function (msg) {
                    return `(${j.name}) ${msg}`;
                }));
            }, [])
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
