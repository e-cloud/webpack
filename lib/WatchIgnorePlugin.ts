/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class WatchIgnorePlugin {
	constructor(paths) {
		this.paths = paths;
	}

	apply(compiler) {
		compiler.plugin('after-environment', function () {
			compiler.watchFileSystem = new IgnoringWatchFileSystem(compiler.watchFileSystem, this.paths);
		}.bind(this));
	}
}

export = WatchIgnorePlugin;

class IgnoringWatchFileSystem {
	constructor(wfs, paths) {
		this.wfs = wfs;
		this.paths = paths;
	}

	watch(files, dirs, missing, startTime, options, callback, callbackUndelayed) {
		const ignored = function (path) {
			return this.paths.some(function (p) {
				return p instanceof RegExp ? p.test(path) : path.indexOf(p) === 0;
			});
		}.bind(this);

		const notIgnored = function (path) {
			return !ignored(path);
		};

		const ignoredFiles = files.filter(ignored);
		const ignoredDirs = dirs.filter(ignored);

		this.wfs.watch(files.filter(notIgnored), dirs.filter(notIgnored), missing, startTime, options, function (
			err,
			filesModified,
			dirsModified,
			missingModified,
			fileTimestamps,
			dirTimestamps
		) {
			if (err) {
				return callback(err);
			}

			ignoredFiles.forEach(function (path) {
				fileTimestamps[path] = 1;
			});

			ignoredDirs.forEach(function (path) {
				dirTimestamps[path] = 1;
			});

			callback(err, filesModified, dirsModified, missingModified, fileTimestamps, dirTimestamps);
		}, callbackUndelayed);
	}
}
