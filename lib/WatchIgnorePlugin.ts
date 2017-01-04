/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler')
import { TimeStampMap, WatchOptions, ErrCallback, WatchFileSystem } from '../typings/webpack-types'

class WatchIgnorePlugin {
    constructor(protected paths: string[]) {
    }

    apply(compiler: Compiler) {
        compiler.plugin(
            'after-environment', () => {
                compiler.watchFileSystem = new IgnoringWatchFileSystem(compiler.watchFileSystem, this.paths);
            }
        );
    }
}

export = WatchIgnorePlugin;

class IgnoringWatchFileSystem {
    constructor(protected wfs: WatchFileSystem, protected paths: (string | RegExp)[]) {
    }

    watch(
        files: string[],
        dirs: string[],
        missing: string[],
        startTime: number,
        options: WatchOptions,
        callback: ErrCallback,
        callbackUndelayed: (fileName: string, changeTime: number) => any
    ) {
        const ignored = (path: string) => this.paths.some(
            p => p instanceof RegExp ? p.test(path) : path.indexOf(p) === 0);

        const notIgnored = (path: string) => !ignored(path);

        const ignoredFiles = files.filter(ignored);
        const ignoredDirs = dirs.filter(ignored);

        return this.wfs.watch(
            files.filter(notIgnored),
            dirs.filter(notIgnored),
            missing,
            startTime,
            options,
            (
                err: Error,
                filesModified: string[],
                dirsModified: string[],
                missingModified: string[],
                fileTimestamps: TimeStampMap,
                dirTimestamps: TimeStampMap
            ) => {
                if (err) {
                    return callback(err);
                }

                ignoredFiles.forEach(
                    path => {
                        fileTimestamps[path] = 1;
                    }
                );

                ignoredDirs.forEach(
                    path => {
                        dirTimestamps[path] = 1;
                    }
                );

                callback(err, filesModified, dirsModified, missingModified, fileTimestamps, dirTimestamps);
            },
            callbackUndelayed
        );
    }
}
