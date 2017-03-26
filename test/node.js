const path = require('path');
const tap = require('tap');
const Node = require('../src/node');

tap.test('node', function (test) {
  test.plan(2);

  test.test('constructor', function(test) {
    test.plan(1);

    test.test('should', function (test) {
      let nodes = new Map();

      nodes.set('foo', 'bar');

      let node = new Node(nodes);

      test.ok(node);

      test.end();
    });
  });

  test.test('toString', function(test) {
    test.test('should handle a node with no nodes', function(test) {
      let node = new Node();

      console.log(node.toString());

      test.end();
    });

    test.test('should handle a node with no attributes', function(test) {
      let node = new Node();

      console.log(node.toString());

      test.end();
    });

    test.test('should handle a node with no attributes', function(test) {
      let node = new Node();

      console.log(node.toString());

      test.end();
    });
  });
});