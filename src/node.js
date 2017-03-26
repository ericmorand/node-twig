const is_object = require('locutus/php/var/is_object');
const gettype = require('locutus/php/var/gettype');
const isset = require('locutus/php/var/isset');
const array_key_exists = require('locutus/php/array/array_key_exists');
const count = require('locutus/php/array/count');
const implode = require('locutus/php/strings/implode');
const explode = require('locutus/php/strings/explode');
const str_repeat = require('locutus/php/strings/str_repeat');
const strlen = require('locutus/php/strings/strlen');
const str_replace = require('locutus/php/strings/str_replace');
const var_export = require('locutus/php/var/var_export');
const ltrim = require('locutus/php/strings/ltrim');

const get_class = function(obj) {
  return obj.constructor.name;
}

/**
 * Represents a node in the AST.
 */
class TwigNode {


  /**
   * Constructor.
   *
   * The nodes are automatically made available as properties (this.node).
   * The attributes are automatically made available as array items (this['name']).
   *
   * @param {Map}     [$nodes]      An array of named nodes
   * @param {Map}     [$attributes] An array of attributes (should not be nodes)
   * @param {Number}  [$lineno]     The line number
   * @param {string}  [$tag]        The tag name associated with the Node
   */
  constructor($nodes, $attributes, $lineno, $tag) {
    $nodes = $nodes || new Map();
    $attributes = $attributes || new Map();
    $lineno = $lineno || 0;

    this.$nodes = null;
    this.$attributes = null;
    this.$lineno = null;
    this.$tag = null;

    this.$name = null;

    $nodes.forEach(function ($node, $name) {
      console.log('FOREACH', $node, $name, $node.prototype instanceof TwigNode);

      if (!$node.prototype instanceof TwigNode) {
        // throw new InvalidArgumentException(sprintf('Using "%s" for the value of node "%s" of "%s" is not supported. You must pass a TwigNode instance.', is_object($node) ? get_class($node) : null === $node ? 'null' : gettype($node), $name, get_class(this)));
        throw new Error(sprintf('Using "%s" for the value of node "%s" of "%s" is not supported. You must pass a TwigNode instance.', is_object($node) ? get_class($node) : null === $node ? 'null' : gettype($node), $name, get_class(this)));
      }
    });

    this.$nodes = $nodes;
    this.$attributes = $attributes;
    this.$lineno = $lineno;
    this.$tag = $tag;
  }

  toString() {
    let $attributes = [];

    this.$attributes.forEach(function ($value, $name) {
      $attributes.push(sprintf('%s: %s', $name, str_replace("\n", '', var_export($value, true))));
    });

    let $repr = [get_class(this) + '(' + implode(', ', $attributes)];

    if (count(this.$nodes)) {
      this.$nodes.forEach(function ($node, $name) {
        let $len = strlen($name) + 4;
        let $noderepr = [];

        explode("\n", $node).forEach(function ($line) {
          $noderepr.push(str_repeat(' ', $len) + $line);
        });

        $repr.push(sprintf('  %s: %s', $name, ltrim(implode("\n", $noderepr))));
      });

      $repr.push(')');
    } else {
      $repr[0] += ')';
    }

    return implode("\n", $repr);
  }

  compile($compiler) {
    this.$nodes.forEach(function ($node) {
      $node.compile($compiler);
    });
  }

  getTemplateLine() {
    return this.$lineno;
  }

  getNodeTag() {
    return this.$tag;
  }

  /**
   * @return {boolean}
   */
  hasAttribute($name) {
    return this.$attributes.has($name);
  }

  /**
   * @return mixed
   */
  getAttribute($name) {
    if (!this.hasAttribute($name)) {
      throw new Error(sprintf('Attribute "%s" does not exist for Node "%s".', $name, typeof this));
    }

    return this.$attributes.get($name);
  }

  /**
   * @param {string}  $name
   * @param {*}       $value
   */
  setAttribute($name, $value) {
    this.$attributes.set($name, $value);
  }

  removeAttribute($name) {
    this.$attributes.delete($name);
  }

  /**
   * @return {boolean}
   */
  hasNode($name) {
    return this.$nodes.has($name);
  }

  /**
   * @return {TwigNode}
   */
  getNode($name) {
    if (!this.hasNode($name)) {
      throw new Error(sprintf('Node "%s" does not exist for Node "%s".', $name, typeof this));
    }

    return this.$nodes[$name];
  }

  setNode($name, $node) {
    this.$nodes.set($name, $node);
  }

  removeNode($name) {
    this.$nodes.delete($name);
  }

  count() {
    return this.$nodes.size;
  }

  getIterator() {
    return this.$nodes.values();
  }

  setTemplateName($name) {
    this.$name = $name;
    this.$nodes.forEach(function ($node) {
      $node.setTemplateName($name);
    })
  }

  getTemplateName() {
    return this.$name;
  }
}

module.exports = TwigNode;
