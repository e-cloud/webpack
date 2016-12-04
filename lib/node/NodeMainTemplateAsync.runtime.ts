/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
/* tslint:disable:no-unused-variable no-unused-expression */

// just for eliminating the compiler error, ignore it
declare var installedChunks: any
declare var $hotChunkFilename$: any
declare var $require$: any
declare var hotAddUpdateChunk: any
declare var $hotMainFilename$: any

/*global installedChunks $hotChunkFilename$ $require$ hotAddUpdateChunk $hotMainFilename$ */
export = function () {
    function hotDownloadUpdateChunk(chunkId: number) {
        // eslint-disable-line no-unused-vars
        const filename = require('path').join(__dirname, $hotChunkFilename$);
        require('fs').readFile(filename, 'utf-8', function (err: Error, content: string) {
            if (err) {
                if ($require$.onError) {
                    return $require$.oe(err);
                }
                else {
                    throw err;
                }
            }
            const chunk: any = {};
            require('vm').runInThisContext(`(function(exports) {${content}\n})`, filename)(chunk);
            hotAddUpdateChunk(chunk.id, chunk.modules);
        });
    }

    function hotDownloadManifest() {
        // eslint-disable-line no-unused-vars
        const filename = require('path').join(__dirname, $hotMainFilename$);
        return new Promise((resolve, reject) => {
            require('fs').readFile(filename, 'utf-8', (err: Error, content: string) => {
                if (err) {
                    return resolve();
                }
                let update
                try {
                    update = JSON.parse(content);
                } catch (e) {
                    return reject(e);
                }
                resolve(update);
            });
        });
    }

    function hotDisposeChunk(chunkId: number) {
        delete installedChunks[chunkId];
    }
};
