module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    // lint js files
    jshint: {
      files: ['**/*.js', '!node_modules/**/*.js']
    },
    // jasmine unit tests
    jasmine_node: {
      specNameMatcher: 'Spec',
      forceExit: true
    }
  });
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jasmine-node');

  grunt.registerTask('test', ['jshint', 'jasmine_node']);
  // Default task(s).
  grunt.registerTask('default', ['test']);
};
