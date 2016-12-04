/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
/* tslint:disable:no-unused-variable no-unused-expression */

// just for eliminating the compiler error, ignore it
declare var installedChunks: any
declare var $hotChunkFilename$: any
declare var hotAddUpdateChunk: any
declare var $hotMainFilename$: any

export = function () {
    function hotDownloadUpdateChunk(chunkId: number) {
        // eslint-disable-line no-unused-vars
        const chunk = require(`./${$hotChunkFilename$}`);
        hotAddUpdateChunk(chunk.id, chunk.modules);
    }

    function hotDownloadManifest() {
        // eslint-disable-line no-unused-vars
        let update
        try {
            update = require(`./${$hotMainFilename$}`);
        } catch (e) {
            return Promise.resolve();
        }
        return Promise.resolve(update);
    }

    function hotDisposeChunk(chunkId: number) {
        delete installedChunks[chunkId];
    }
};
