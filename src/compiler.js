const ksort = require('locutus/php/array/ksort');
const addcslashes = require('locutus/php/strings/addcslashes');
const setlocale = require('locutus/php/strings/setlocale');
const sprintf = require('locutus/php/strings/sprintf');
const str_repeat = require('locutus/php/strings/str_repeat');
const strlen = require('locutus/php/strings/strlen');
const substr_count = require('locutus/php/strings/substr_count');
const hash = require('locutus/php/strings/md5');
const is_bool = require('locutus/php/var/is_bool');
const is_array = require('locutus/php/var/is_array');
const is_int = require('locutus/php/var/is_int');
const is_float = require('locutus/php/var/is_float');
const uniqid = require('locutus/php/misc/uniqid');
const mt_rand = require('locutus/php/math/mt_rand');

/**
 * Compiles a node to javascript code.
 *
 * @author Eric MORAND <eric.morand@gmail.com>
 */
class TwigCompiler {
  /**
   *
   * @param $env {TwigEnvironment}
   */
  constructor($env) {
    this.lastLine = null;
    this.source = null;
    this.indentation = null;
    this.env = $env;
    this.debugInfo = [];
    this.sourceOffset = null;
    this.sourceLine = null;
  }

  /**
   * Returns the environment instance related to this compiler.
   *
   * @return Twig_Environment
   */
  getEnvironment() {
    return this.env;
  }

  /**
   * Gets the current PHP code after compilation.
   *
   * @return string The PHP code
   */
  getSource() {
    return this.source;
  }

  /**
   * Compiles a node.
   *
   * @param {TwigNode}  $node        The node to compile
   * @param {Number}   $indentation The current indentation
   *
   * @return {TwigCompiler}
   */
  compile($node, $indentation) {
    $indentation = $indentation || 0;

    this.lastLine = null;
    this.source = '';
    this.debugInfo = [];
    this.sourceOffset = 0;
    // source code starts at 1 (as we then increment it when we encounter new lines)
    this.sourceLine = 1;
    this.indentation = $indentation;

    $node.compile(this);

    return this;
  }

  subcompile($node, $raw) {
    if (false === ($raw || true)) {
      this.source += str_repeat(' ', this.indentation * 4);
    }

    $node.compile(this);

    return this;
  }

  /**
   * Adds a raw string to the compiled code.
   *
   * @param {string} $string The string
   *
   * @return {TwigCompiler}
   */
  raw($string) {
    this.source += $string;

    return this;
  }

  /**
   * Writes a string to the compiled code by adding indentation.
   *
   * @return {TwigCompiler}
   */
  write() {
    let self = this;

    args.forEach(function ($string) {
      self.source += str_repeat(' ', this.indentation * 4) + $string;
    });

    return this;
  }

  /**
   * Adds a quoted string to the compiled code.
   *
   * @param {string} $value The string
   *
   * @return {TwigCompiler}
   */
  string($value) {
    this.source += sprintf('"%s"', addcslashes($value, "\0\t\"\$\\"));

    return this;
  }

  /**
   * Returns a PHP representation of a given value.
   *
   * @param $value The value to convert
   *
   * @return {TwigCompiler}
   */
  repr($value) {
    if (is_int($value) || is_float($value)) {
      let $locale = setlocale(LC_NUMERIC, '0');

      if ($locale !== false) {
        setlocale(LC_NUMERIC, 'C');
      }

      this.raw($value);

      if (false !== $locale) {
        setlocale(LC_NUMERIC, $locale);
      }
    }
    else if (null === $value) {
      this.raw('null');
    }
    else if (is_bool($value)) {
      this.raw($value ? 'true' : 'false');
    }
    else if (is_array($value)) {
      this.raw('array(');
      $first = true;

      $value.forEach(function ($v, $key) {
        if (!$first) {
          this.raw(', ');
        }
        $first = false;
        this.repr($key);
        this.raw(' => ');
        this.repr($v);
      });

      this.raw(')');
    }
    else {
      this.string($value);
    }

    return this;
  }

  /**
   * Adds debugging information.
   *
   * @return {TwigCompiler}
   */
  addDebugInfo($node) {
    if ($node.getTemplateLine() != this.lastLine) {
      this.write(sprintf("// line %d\n", $node.getTemplateLine()));

      this.sourceLine += substr_count(this.source, "\n", this.sourceOffset);
      this.sourceOffset = strlen(this.source);
      this.debugInfo[this.sourceLine] = $node.getTemplateLine();

      this.lastLine = $node.getTemplateLine();
    }

    return this;
  }

  getDebugInfo() {
    ksort(this.debugInfo);

    return this.debugInfo;
  }

  /**
   * Indents the generated code.
   *
   * @param {Number} $step The number of indentation to add
   *
   * @return {TwigCompiler}
   */
  indent($step) {
    $step = $step || 1;

    this.indentation += $step;

    return this;
  }

  /**
   * Outdents the generated code.
   *
   * @param {Number} $step The number of indentation to remove
   *
   * @return {TwigCompiler}
   *
   * @throws LogicException When trying to outdent too much so the indentation would become negative
   */
  outdent($step) {
    $step = $step || 1;

    // can't outdent by more steps than the current indentation level
    if (this.indentation < $step) {
      throw new LogicException('Unable to call outdent() as the indentation would become negative.');
    }

    this.indentation -= $step;

    return this;
  }

  getVarName() {
    return sprintf('__internal_%s', hash(uniqid(mt_rand(), true)));
  }
}

module.exports = TwigCompiler;