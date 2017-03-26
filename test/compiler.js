const path = require('path');
const tap = require('tap');
const Compiler = require('../src/compiler');

tap.test('compiler', function (test) {
  test.plan(2);

  test.test('constructor', function(test) {
    test.plan(1);

    test.test('should support a template', function (test) {
      let compiler = new Compiler();

      test.ok(compiler);

      test.end();
    });
  });

  test.test('getVarName', function(test) {
    let compiler = new Compiler();

    console.log(compiler.getVarName());

    test.end();
  });
});