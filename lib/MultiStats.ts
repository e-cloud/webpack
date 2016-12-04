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
        const jsons = this.stats.map(stat => {
            const obj = stat.toJson(options, forToString);
            obj.name = stat.compilation && stat.compilation.name;
            return obj;
        });
        const obj: any = {
            errors: jsons.reduce((arr, j) =>
                    arr.concat(j.errors.map((msg: string) => `(${j.name}) ${msg}`))
                , []),
            warnings: jsons.reduce((arr, j) =>
                    arr.concat(j.warnings.map((msg: string) => `(${j.name}) ${msg}`))
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

export default MultiStats
