/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import async = require('async');

import path = require('path');
import Tapable = require('tapable');
import ContextModule = require('./ContextModule');
import ContextElementDependency = require('./dependencies/ContextElementDependency');

class ContextModuleFactory extends Tapable {
	constructor(resolvers) {
		super();
		this.resolvers = resolvers;
	}

	create(data, callback) {
		const module = this;
		const context = data.context;
		const dependencies = data.dependencies;
		const dependency = dependencies[0];
		this.applyPluginsAsyncWaterfall('before-resolve', {
			context,
			request: dependency.request,
			recursive: dependency.recursive,
			regExp: dependency.regExp,
			async: dependency.async,
			dependencies
		}, function (err, result) {
			if (err) {
				return callback(err);
			}

			// Ignored
			if (!result) {
				return callback();
			}

			const context = result.context;
			const request = result.request;
			const recursive = result.recursive;
			const regExp = result.regExp;
			const asyncContext = result.async;
			const dependencies = result.dependencies;

			let loaders;
			let resource;
			let loadersPrefix = '';
			const idx = request.lastIndexOf('!');
			if (idx >= 0) {
				loaders = request.substr(0, idx + 1);
				for (var i = 0; i < loaders.length && loaders[i] === '!'; i++) {
					loadersPrefix += '!';
				}
				loaders = loaders.substr(i).replace(/!+$/, '').replace(/!!+/g, '!');
				if (loaders === '') {
					loaders = [];
				}
				else {
					loaders = loaders.split('!');
				}
				resource = request.substr(idx + 1);
			}
			else {
				loaders = [];
				resource = request;
			}

			const resolvers = module.resolvers;

			async.parallel([
				function (callback) {
					resolvers.context.resolve({}, context, resource, function (err, result) {
						if (err) {
							return callback(err);
						}
						callback(null, result);
					});
				}, function (callback) {
					async.map(loaders, function (loader, callback) {
						resolvers.loader.resolve({}, context, loader, function (err, result) {
							if (err) {
								return callback(err);
							}
							callback(null, result);
						});
					}, callback);
				}
			], function (err, result) {
				if (err) {
					return callback(err);
				}

				module.applyPluginsAsyncWaterfall('after-resolve', {
					loaders: loadersPrefix + result[1].join('!') + (result[1].length > 0 ? '!' : ''),
					resource: result[0],
					recursive,
					regExp,
					async: asyncContext,
					dependencies,
					resolveDependencies: module.resolveDependencies.bind(module)
				}, function (err, result) {
					if (err) {
						return callback(err);
					}

					// Ignored
					if (!result) {
						return callback();
					}

					return callback(null, new ContextModule(result.resolveDependencies, result.resource, result.recursive, result.regExp, result.loaders, result.async));
				});
			});
		});
	}

	resolveDependencies(fs, resource, recursive, regExp, callback) {
		if (!regExp || !resource) {
			return callback(null, []);
		}
		(function addDirectory(directory, callback) {
			fs.readdir(directory, function (err, files) {
				if (err) {
					return callback(err);
				}
				if (!files || files.length === 0) {
					return callback(null, []);
				}
				async.map(files.filter(function (p) {
					return p.indexOf('.') !== 0;
				}), function (seqment, callback) {

					const subResource = path.join(directory, seqment);

					fs.stat(subResource, function (err, stat) {
						if (err) {
							return callback(err);
						}

						if (stat.isDirectory()) {

							if (!recursive) {
								return callback();
							}
							addDirectory.call(this, subResource, callback);
						}
						else if (stat.isFile()) {

							const obj = {
								context: resource,
								request: `.${subResource.substr(resource.length).replace(/\\/g, '/')}`
							};

							this.applyPluginsAsyncWaterfall('alternatives', [obj], function (err, alternatives) {
								if (err) {
									return callback(err);
								}
								alternatives = alternatives.filter(function (obj) {
									return regExp.test(obj.request);
								}).map(function (obj) {
									const dep = new ContextElementDependency(obj.request);
									dep.optional = true;
									return dep;
								});
								callback(null, alternatives);
							});
						}
						else {
							callback();
						}
					}.bind(this));
				}.bind(this), function (err, result) {
					if (err) {
						return callback(err);
					}

					if (!result) {
						return callback(null, []);
					}

					callback(null, result.filter(function (i) {
						return !!i;
					}).reduce(function (a, i) {
						return a.concat(i);
					}, []));
				});
			}.bind(this));
		}).call(this, resource, callback);
	}
}

export = ContextModuleFactory;
