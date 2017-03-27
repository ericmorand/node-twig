const path = require('path');
const tap = require('tap');
const TwigNode = require('../src/node');

tap.test('node', function (test) {
  test.plan(2);

  test.test('constructor', function (test) {
    test.plan(1);

    test.test('should throw an exception when passed an invalid node as parameter', function (test) {
      class SubNode extends TwigNode {
      }

      try {
        let node = new TwigNode(new Map([
          ['foo', new SubNode()]
        ]));

        test.ok(node);
      }
      catch (err) {
        test.fail(err.message);
      }

      try {
        let node = new TwigNode(new Map([
          ['foo', 'bar']
        ]));

        test.fail(node);
      }
      catch (err) {
        test.ok(err);
        test.equal(err.message, 'Using "string" for the value of node "foo" of "TwigNode" is not supported. You must pass a TwigNode instance.');
      }

      test.end();
    });
  });

  test.test('toString', function (test) {
    test.plan(3);

    test.test('should handle an empty node', function (test) {
      let node = new TwigNode();

      test.equal(node.toString(), 'TwigNode(\n)');

      test.end();
    });

    test.test('should handle a node with nodes', function (test) {
      let node = new TwigNode(new Map([
        ['foo', new TwigNode()]
      ]));

      test.equal(node.toString(), 'TwigNode(\n  foo: TwigNode(\n       )\n)');

      test.end();
    });

    test.test('should handle a node with attributes', function (test) {
      let node = new TwigNode(null, new Map([
        ['foo', 'bar'],
        ['bar', 'foo']
      ]));

      test.equal(node.toString(), 'TwigNode(foo: \'bar\', bar: \'foo\'\n)');

      test.end();
    });
  });
});