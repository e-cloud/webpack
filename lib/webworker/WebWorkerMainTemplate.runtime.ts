/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
// just for eliminating the compiler error, ignore it
declare var installedChunks
declare var hotAddUpdateChunk
declare var parentHotUpdateCallback
declare var importScripts
declare var XMLHttpRequest
declare var $require$
declare var $hotChunkFilename$
declare var $hotMainFilename$

export = function () {
    function webpackHotUpdateCallback(chunkId, moreModules) {
        // eslint-disable-line no-unused-vars
        hotAddUpdateChunk(chunkId, moreModules);
        if (parentHotUpdateCallback) {
            parentHotUpdateCallback(chunkId, moreModules);
        }
    } //$semicolon

    function hotDownloadUpdateChunk(chunkId) {
        // eslint-disable-line no-unused-vars
        importScripts($require$.p + $hotChunkFilename$);
    }

    function hotDownloadManifest(callback) {
        // eslint-disable-line no-unused-vars
        return new Promise((resolve, reject) => {
            if (typeof XMLHttpRequest === 'undefined') {
                return reject(new Error('No browser support'));
            }
            try {
                var request = new XMLHttpRequest();
                var requestPath = $require$.p + $hotMainFilename$;
                request.open('GET', requestPath, true);
                request.timeout = 10000;
                request.send(null);
            } catch (err) {
                return reject(err);
            }
            request.onreadystatechange = () => {
                if (request.readyState !== 4) {
                    return;
                }
                if (request.status === 0) {
                    // timeout
                    reject(new Error(`Manifest request to ${requestPath} timed out.`));
                }
                else if (request.status === 404) {
                    // no update available
                    resolve();
                }
                else if (request.status !== 200 && request.status !== 304) {
                    // other failure
                    reject(new Error(`Manifest request to ${requestPath} failed.`));
                }
                else {
                    // success
                    try {
                        var update = JSON.parse(request.responseText);
                    } catch (e) {
                        reject(e);
                        return;
                    }
                    resolve(update);
                }
            };
        });
    }

    function hotDisposeChunk(chunkId) {
        delete installedChunks[chunkId];
    }
};
