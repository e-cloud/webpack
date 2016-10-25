/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DependenciesBlock = require('./DependenciesBlock');

class AsyncDependenciesBlock extends DependenciesBlock {
    constructor(name, module, loc) {
        super();
        this.chunkName = name;
        this.chunks = null;
        this.module = module;
        this.loc = loc;

        Object.defineProperty(this, 'chunk', {
            get() {
                throw new Error('`chunk` was been renamed to `chunks` and is now an array');
            },
            set() {
                throw new Error('`chunk` was been renamed to `chunks` and is now an array');
            }
        });
    }

    updateHash(hash) {
        hash.update(this.chunkName || '');
        hash.update(this.chunks && this.chunks.map(function (chunk) {
                return typeof chunk.id === 'number' ? chunk.id : '';
            }).join(',') || '');
        super.updateHash(hash);
    }

    disconnect() {
        this.chunks = null;
        super.disconnect();
    }

    unseal() {
        this.chunks = null;
        super.unseal();
    }

    sortItems() {
        super.sortItems();
        if (this.chunks) {
            this.chunks.sort(function (a, b) {
                let i = 0;
                while (true) {
                    if (!a.modules[i] && !b.modules[i]) {
                        return 0;
                    }
                    if (!a.modules[i]) {
                        return -1;
                    }
                    if (!b.modules[i]) {
                        return 1;
                    }
                    if (a.modules[i].id > b.modules[i].id) {
                        return 1;
                    }
                    if (a.modules[i].id < b.modules[i].id) {
                        return -1;
                    }
                    i++;
                }
            });
        }
    }
}

export = AsyncDependenciesBlock;
