import Stats = require('./Stats')
import { StatsOptions } from '../typings/webpack-types'

class MultiStats {
    hash: string

    constructor(public stats: Stats[]) {
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

    toJson(options: StatsOptions, forToString: boolean) {
        if (typeof options === 'boolean' || typeof options === 'string') {
            options = Stats.presetToOptions(options);
        }
        else if (!options) {
            options = {} as any;
        }
        const jsons = this.stats.map((stat, idx) => {
            const childOptions = Stats.getChildOptions(options, idx);
            const obj = stat.toJson(childOptions, forToString);
            obj.name = stat.compilation && stat.compilation.name;
            return obj;
        });
        const showVersion = typeof options.version === 'undefined'
            ? jsons.every(j => !!j.version)
            : options.version !== false;
        const showHash = typeof options.hash === 'undefined'
            ? jsons.every(j => !!j.hash)
            : options.hash !== false;
        jsons.forEach(j => {
            if (showVersion) {
                delete j.version;
            }
        });
        const obj: any = {
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
        if (showVersion) {
            obj.version = require('../package.json').version;
        }
        if (showHash) {
            obj.hash = this.hash;
        }
        if (options.children !== false) {
            obj.children = jsons;
        }
        return obj;
    }
}

MultiStats.prototype.toString = Stats.prototype.toString;

export = MultiStats
