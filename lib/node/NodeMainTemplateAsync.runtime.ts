/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

// just for eliminating the compiler error, ignore it
declare var installedChunks
declare var $hotChunkFilename$
declare var $require$
declare var hotAddUpdateChunk
declare var $hotMainFilename$

/*global installedChunks $hotChunkFilename$ $require$ hotAddUpdateChunk $hotMainFilename$ */
export = function () {
    function hotDownloadUpdateChunk(chunkId) {
        // eslint-disable-line no-unused-vars
        const filename = require('path').join(__dirname, $hotChunkFilename$);
        require('fs').readFile(filename, 'utf-8', function (err, content) {
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
            require('fs').readFile(filename, 'utf-8', (err, content) => {
                if (err) {
                    return resolve();
                }
                try {
                    var update = JSON.parse(content);
                } catch (e) {
                    return reject(e);
                }
                resolve(update);
            });
        });
    }

    function hotDisposeChunk(chunkId) {
        delete installedChunks[chunkId];
    }
};
