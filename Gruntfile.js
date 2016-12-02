module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    // lint js files
    jshint: {
      files: ['**/*.js', '!node_modules/**/*.js']
    },
    jasmine_node: {
     options: {
       forceExit: true,
       match: '.',
       matchall: false,
       extensions: 'js',
       specNameMatcher: 'spec'
     },
     all: ['spec/']
   }
  });
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jasmine-node');

  grunt.registerTask('test', ['jshint', 'jasmine_node']);
  // Default task(s).
  grunt.registerTask('default', ['test']);
};
