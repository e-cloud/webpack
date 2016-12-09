/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Watchpack = require('watchpack');
import { WatchOptions, ErrCallback, AbstractInputFileSystem } from '../../typings/webpack-types'

class NodeWatchFileSystem {
    watcherOptions: {
        aggregateTimeout: number
    }
    watcher: Watchpack

    constructor(public inputFileSystem: AbstractInputFileSystem) {
        this.watcherOptions = {
            aggregateTimeout: 0
        };
        this.watcher = new Watchpack(this.watcherOptions);
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
        if (!Array.isArray(files)) {
            throw new Error('Invalid arguments: \'files\'');
        }
        if (!Array.isArray(dirs)) {
            throw new Error('Invalid arguments: \'dirs\'');
        }
        if (!Array.isArray(missing)) {
            throw new Error('Invalid arguments: \'missing\'');
        }
        if (typeof callback !== 'function') {
            throw new Error('Invalid arguments: \'callback\'');
        }
        if (typeof startTime !== 'number' && startTime) {
            throw new Error('Invalid arguments: \'startTime\'');
        }
        if (typeof options !== 'object') {
            throw new Error('Invalid arguments: \'options\'');
        }
        if (typeof callbackUndelayed !== 'function' && callbackUndelayed) {
            throw new Error('Invalid arguments: \'callbackUndelayed\'');
        }
        const oldWatcher = this.watcher;
        this.watcher = new Watchpack(options);

        if (callbackUndelayed) {
            this.watcher.once('change', callbackUndelayed);
        }

        this.watcher.once('aggregated', (changes: string[]) => {
            if (this.inputFileSystem && this.inputFileSystem.purge) {
                this.inputFileSystem.purge(changes);
            }
            const times = this.watcher.getTimes();
            callback(
                null,
                changes.filter((file: string) => files.includes(file)).sort(),
                changes.filter((file: string) => dirs.includes(file)).sort(),
                changes.filter((file: string) => missing.includes(file)).sort(),
                times,
                times
            );
        });

        this.watcher.watch(files.concat(missing), dirs, startTime);

        if (oldWatcher) {
            oldWatcher.close();
        }
        return {
            close: () => {
                this.watcher.close();
            },
            pause: () => {
                this.watcher.pause();
            }
        };
    }
}

export = NodeWatchFileSystem;
