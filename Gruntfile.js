/*global module*/
module.exports = function (grunt) {
	'use strict';

	// Project configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),

		csslint: {
			options: grunt.file.readJSON('.csslintrc')
		},

		copy: {
			main: {
				src: "src/<%= pkg.name %>.js",
				dest: "build/<%= pkg.version %>/<%= pkg.name %>.js"
			}
		},

		jasmine: {
			src: 'src/<%= pkg.name %>.js',
			options: {
				specs: 'tests/*.js',
				styles: 'build/<%= pkg.version %>/<%= pkg.name %>.min.css',
				vendor: [
					'libs/jquery.js',
					'libs/jquery-ui.js',
					'libs/jquery.simulate.js',
					'libs/jquery.event.drag.js',
					'libs/FileSaver.js',
					'libs/underscore.js',
                    'libs/backbone.js',
					'libs/less.js',
					'libs/jasmine/jasmine-jquery.js'
                ]
			}
		},

		jshint: {
			options: {
				jshintrc: '.jshintrc',
			},
			src: ['src/<%= pkg.name %>.js']
		},

		less: {
			compressed: {
				options: {
					yuicompress: true
				},
				files: {
					'build/<%= pkg.version %>/<%= pkg.name %>.min.css': 'src/<%= pkg.name %>.less'
				}
			},
			standard: {
				files: {
					'build/<%= pkg.version %>/themes/<%= pkg.name %>-light.css': 'src/themes/<%= pkg.name %>-light.less',
					'build/<%= pkg.version %>/themes/<%= pkg.name %>-dark.css': 'src/themes/<%= pkg.name %>-dark.less'
				}
			}
		},

		lesslint: {
			src: [
				'src/doby-grid.less',
				'src/themes/*.less'
			]
		},

		uglify: {
			options: {
				banner: [
					'// <%= pkg.name %>.js <%= pkg.version %>',
					'// (c) 2014 Evgueni Naverniouk, Globex Designs, Inc.',
					'// Doby may be freely distributed under the MIT license.',
					'// For all details and documentation:',
					'// https://github.com/globexdesigns/doby-grid\n'
				].join('\n'),
				mangle: {
					except: ['jQuery', 'Backbone', 'FileSaver']
				}
			},

			build: {
				src: 'src/<%= pkg.name %>.js',
				dest: 'build/<%= pkg.version %>/<%= pkg.name %>.min.js'
			}
		}
	});

	// Load plugins
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-jasmine');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-lesslint');

	// Grunt "default" task (validation only)
	grunt.registerTask('default', ['lesslint', 'less', 'jshint', 'jasmine']);

	// Grunt "build" task
	grunt.registerTask('build', ['lesslint', 'less', 'jshint', 'jasmine', 'uglify', 'copy']);

};
