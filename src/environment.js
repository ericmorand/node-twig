const TwigExtensionCore = require('./extension-core');
const TwigExtensionSet = require('./extension-set');
const TwigExtensionEscaper = require('./extension-escaper');
const TwigExtensionOptimizer = require('./extension-optimizer');
const TwigCacheInterface = require('./cache-interface');
const TwigCacheFilesystem = require('./cache/file-system');
const TwigCacheNull = require('./cache/null');
const TwigCompiler = require('./compiler');
const TwigTemplate = require('./template');
const TwigTemplateWrapper = require('./template-wrapper');
const TwigError = require('./error');
const TwigErrorRuntime = require('./error/runtime');
const TwigErrorLoader = require('./error/loader');
const TwigErrorSyntax = require('./error/syntax');
const TwigLoaderChain = require('./loader/chain');
const TwigLoaderArray = require('./loader/array');
const TwigLexer = require('./lexer');
const TwigParser = require('./parser');

const is_object = require('locutus/php/var/is_object');
const gettype = require('locutus/php/var/gettype');
const isset = require('locutus/php/var/isset');
const array_key_exists = require('locutus/php/array/array_key_exists');
const count = require('locutus/php/array/count');
const implode = require('locutus/php/strings/implode');
const sprintf = require('locutus/php/strings/sprintf');
const str_repeat = require('locutus/php/strings/str_repeat');
const strlen = require('locutus/php/strings/strlen');
const str_replace = require('locutus/php/strings/str_replace');
const var_export = require('locutus/php/var/var_export');
const ltrim = require('locutus/php/strings/ltrim');
const array_merge = require('locutus/php/array/array_merge');
const hash = require('locutus/php/strings/md5');
const uniqid = require('locutus/php/misc/uniqid');
const mt_rand = require('locutus/php/math/mt_rand');
const strtoupper = require('locutus/php/strings/strtoupper');

/**
 * Stores the Twig configuration.
 *
 */
class TwigEnvironment {
  /**
   * Constructor.
   *
   * Available options:
   *
   *  * debug: When set to true, it automatically set "auto_reload" to true as
   *           well (default to false).
   *
   *  * charset: The charset used by the templates (default to UTF-8).
   *
   *  * base_template_class: The base template class to use for generated
   *                         templates (default to Twig_Template).
   *
   *  * cache: An absolute path where to store the compiled templates,
   *           a Twig_Cache_Interface implementation,
   *           or false to disable compilation cache (default).
   *
   *  * auto_reload: Whether to reload the template if the original source changed.
   *                 If you don't provide the auto_reload option, it will be
   *                 determined automatically based on the debug value.
   *
   *  * strict_variables: Whether to ignore invalid variables in templates
   *                      (default to false).
   *
   *  * autoescape: Whether to enable auto-escaping (default to html):
   *                  * false: disable auto-escaping
   *                  * html, js: set the autoescaping to one of the supported strategies
   *                  * name: set the autoescaping strategy based on the template name extension
   *                  * PHP callback: a PHP callback that returns an escaping strategy based on the template "name"
   *
   *  * optimizations: A flag that indicates which optimizations to apply
   *                   (default to -1 which means that all optimizations are enabled;
   *                   set it to 0 to disable).
   *
   * @param {TwigLoaderInterface} $loader
   * @param {Array}               [$options] An array of options
   */
  constructor($loader, $options) {
    $options = $options || {};

    this.charset = null;
    this.loader = null;
    this.debug = null;
    this.autoReload = null;
    this.cache = null;
    this.lexer = null;
    this.parser = null;
    this.compiler = null;
    this.baseTemplateClass = null;
    this.globals = [];
    this.resolvedGlobals = null;
    this.loadedTemplates = null;
    this.strictVariables = null;
    this.templateClassPrefix = '__TwigTemplate_';
    this.originalCache = null;
    this.extensionSet = null;
    this.runtimeLoaders = [];
    this.runtimes = [];
    this.optionsHash = null;

    this.loader = $loader;

    $options = array_merge({
      debug: false,
      charset: 'UTF-8',
      base_template_class: 'TwigTemplate',
      strict_variables: false,
      autoescape: 'html',
      cache: false,
      auto_reload: null,
      optimizations: -1
    }, $options);

    this.debug = $options.debug;
    this.setCharset($options.charset);
    this.baseTemplateClass = $options.base_template_class;
    this.autoReload = null === $options.auto_reload ? this.debug : $options.auto_reload;
    this.strictVariables = $options.strict_variables;
    this.setCache($options.cache);
    this.extensionSet = new TwigExtensionSet();

    this.addExtension(new TwigExtensionCore());
    this.addExtension(new TwigExtensionEscaper($options.autoescape));
    this.addExtension(new TwigExtensionOptimizer($options.optimizations));
  }

  /**
   * Gets the base template class for compiled templates.
   *
   * @return {string} The base template class name
   */
  getBaseTemplateClass() {
    return this.baseTemplateClass;
  }

  /**
   * Sets the base template class for compiled templates.
   *
   * @param {string} value The base template class name
   */
  setBaseTemplateClass(value) {
    this.baseTemplateClass = value;
    this.updateOptionsHash();
  }

  /**
   * Enables debugging mode.
   */
  enableDebug() {
    this.debug = true;
    this.updateOptionsHash();
  }

  /**
   * Disables debugging mode.
   */
  disableDebug() {
    this.debug = false;
    this.updateOptionsHash();
  }

  /**
   * Checks if debug mode is enabled.
   *
   * @return bool true if debug mode is enabled, false otherwise
   */
  isDebug() {
    return this.debug;
  }

  /**
   * Enables the auto_reload option.
   */
  enableAutoReload() {
    this.autoReload = true;
  }

  /**
   * Disables the auto_reload option.
   */
  disableAutoReload() {
    this.autoReload = false;
  }

  /**
   * Checks if the auto_reload option is enabled.
   *
   * @return bool true if auto_reload is enabled, false otherwise
   */
  isAutoReload() {
    return this.autoReload;
  }

  /**
   * Enables the strict_variables option.
   */
  enableStrictVariables() {
    this.strictVariables = true;
    this.updateOptionsHash();
  }

  /**
   * Disables the strict_variables option.
   */
  disableStrictVariables() {
    this.strictVariables = false;
    this.updateOptionsHash();
  }

  /**
   * Checks if the strict_variables option is enabled.
   *
   * @return bool true if strict_variables is enabled, false otherwise
   */
  isStrictVariables() {
    return this.strictVariables;
  }

  /**
   * Gets the current cache implementation.
   *
   * @param {boolean} original Whether to return the original cache option or the real cache instance
   *
   * @return {TwigCacheInterface|string|boolean} A TwigCacheInterface implementation,
   *                                           an absolute path to the compiled templates,
   *                                           or false to disable cache
   */
  getCache(original) {
    return (original || true) ? this.originalCache : this.cache;
  }

  /**
   * Sets the current cache implementation.
   *
   * @param {TwigCacheInterface|string|boolean} cache A TwigCacheInterface implementation,
   *                                                  an absolute path to the compiled templates,
   *                                                  or false to disable cache
   */
  setCache(cache) {
    if (typeof cache === 'string') {
      this.originalCache = cache;
      this.cache = new TwigCacheFilesystem(cache);
    }
    else if (false === cache) {
      this.originalCache = cache;
      this.cache = new TwigCacheNull();
    }
    else if (cache instanceof TwigCacheInterface) {
      this.originalCache = this.cache = cache;
    }
    else {
      throw new Error('Cache can only be a string, false, or a TwigCacheInterface implementation.');
    }
  }

  /**
   * Gets the template class associated with the given string.
   *
   * The generated template class is based on the following parameters:
   *
   *  * The cache key for the given template;
   *  * The currently enabled extensions;
   *  * Whether the Twig C extension is available or not;
   *  * PHP version;
   *  * Twig version;
   *  * Options with what environment was created.
   *
   * @param {string}   $name  The name for which to calculate the template class name
   * @param {Number}   [$index] The index if it is an embedded template
   *
   * @return string The template class name
   */
  getTemplateClass($name, $index) {
    let $key = this.getLoader().getCacheKey($name) + this.optionsHash;

    return this.templateClassPrefix.hash('sha256', $key) + (null === $index ? '' : '_' + $index);
  }

  /**
   * Renders a template.
   *
   * @param {string} $name    The template name
   * @param {Array}  $context An array of parameters to pass to the template
   *
   * @return string The rendered template
   *
   * @throws TwigErrorLoader  When the template cannot be found
   * @throws TwigErrorSyntax  When an error occurred during compilation
   * @throws TwigErrorRuntime When an error occurred during rendering
   */
  render($name, $context) {
    return this.loadTemplate($name).render($context);
  }

  /**
   * Displays a template.
   *
   * @param {string} $name    The template name
   * @param {Array}  $context An array of parameters to pass to the template
   *
   * @throws TwigErrorLoader  When the template cannot be found
   * @throws TwigErrorSyntax  When an error occurred during compilation
   * @throws TwigErrorRuntime When an error occurred during rendering
   */
  display($name, $context) {
    this.loadTemplate($name).display($context);
  }

  /**
   * Loads a template.
   *
   * @param {string|TwigTemplateWrapper|TwigTemplate} $name The template name
   *
   * @return {TwigTemplateWrapper}
   */
  load($name) {
    if ($name instanceof TwigTemplateWrapper) {
      return $name;
    }

    if ($name instanceof TwigTemplate) {
      return new TwigTemplateWrapper(this, $name);
    }

    return new TwigTemplateWrapper(this, this.loadTemplate($name));
  }

  /**
   * Loads a template internal representation.
   *
   * This method is for internal use only and should never be called
   * directly.
   *
   * @param {string}  $name     The template name
   * @param {Number}  [$index]  The index if it is an embedded template
   *
   * @return {TwigTemplate} A template instance representing the given template name
   *
   * @throws {TwigErrorLoader}  When the template cannot be found
   * @throws {TwigErrorRuntime} When a previously generated cache is corrupted
   * @throws {TwigErrorSyntax}  When an error occurred during compilation
   *
   * @internal
   */
  loadTemplate($name, $index) {
    let $cls = this.getTemplateClass($name);
    let $mainCls = $cls;

    if (null !== $index) {
      $cls += '_' + $index;
    }

    if (isset(this.loadedTemplates[$cls])) {
      return this.loadedTemplates[$cls];
    }

    if (!class_exists(cls, false)) {
      let $key = this.cache.generateKey($name, $mainCls);

      if (!this.isAutoReload() || this.isTemplateFresh($name, this.cache.getTimestamp($key))) {
        this.cache.load($key);
      }

      if (!class_exists($cls, false)) {
        let $source = this.getLoader().getSourceContext($name);
        let $content = this.compileSource($source);

        this.cache.write($key, $content);
        this.cache.load($key);

        if (!class_exists($mainCls, false)) {
          /* Last line of defense if either this.bcWriteCacheFile was used,
           * this.cache is implemented as a no-op or we have a race condition
           * where the cache was cleared between the above calls to write to and load from
           * the cache.
           */
          eval('?>' + $content);
        }

        if (!class_exists($cls, false)) {
          throw new TwigErrorRuntime(sprintf('Failed to load Twig template "%s", index "%s": cache is corrupted.', name, $index), -1, $source);
        }
      }
    }

    // to be removed in 3.0
    this.extensionSet.initRuntime(this);

    return this.loadedTemplates[$cls] = new $cls(this);
  }

  /**
   * Creates a template from source.
   *
   * This method should not be used as a generic way to load templates.
   *
   * @param {string} $template The template name
   *
   * @return {TwigTemplate} A template instance representing the given template name
   *
   * @throws {TwigErrorLoader} When the template cannot be found
   * @throws {TwigErrorSyntax} When an error occurred during compilation
   */
  createTemplate($template) {
    let $name = sprintf('__string_template__%s', hash(uniqid(mt_rand(), true)));

    let $current = this.getLoader();

    let $loader = new TwigLoaderChain([
      new TwigLoaderArray({
        name: $template
      }),
      $current
    ]);

    this.setLoader($loader);

    let $result = null;

    try {
      $result = this.loadTemplate($name);
    }
    finally {
      this.setLoader($current);
    }

    return $result;
  }

  /**
   * Returns true if the template is still fresh.
   *
   * Besides checking the loader for freshness information,
   * this method also checks if the enabled extensions have
   * not changed.
   *
   * @param {string}  $name The template name
   * @param {Number}  $time The last modification time of the cached template
   *
   * @return bool true if the template is fresh, false otherwise
   */
  isTemplateFresh($name, $time) {
    return this.extensionSet.getLastModified() <= $time && this.getLoader().isFresh($name, $time);
  }

  /**
   * Tries to load a template consecutively from an array.
   *
   * Similar to loadTemplate() but it also accepts Twig_Template instances and an array
   * of templates where each is tried to be loaded.
   *
   * @param {string|TwigTemplate|Array} $names A template or an array of templates to try consecutively
   *
   * @return {TwigTemplate}
   *
   * @throws {TwigErrorLoader} When none of the templates can be found
   * @throws {TwigErrorSyntax} When an error occurred during compilation
   */
  resolveTemplate($names) {
    let self = this;

    if (!Array.isArray($names)) {
      $names = [$names];
    }

    let error = null;

    $names.forEach(function ($name) {
      if ($name instanceof TwigTemplate) {
        return $name;
      }

      try {
        return self.loadTemplate($name);
      }
      catch (err) {
        error = err;
      }
    });

    if (1 === $names.length) {
      throw error;
    }

    throw new TwigErrorLoader(sprintf('Unable to find one of the following templates: "%s".', implode('", "', $names)));
  }

  setLexer($lexer) {
    this.lexer = $lexer;
  }

  /**
   * Tokenizes a source code.
   *
   * @return {TwigTokenStream}
   *
   * @throws {TwigErrorSyntax} When the code is syntactically wrong
   */
  tokenize($source) {
    if (null === this.lexer) {
      this.lexer = new TwigLexer(this);
    }

    return this.lexer.tokenize($source);
  }

  setParser(parser) {
    this.parser = parser;
  }

  /**
   * Converts a token stream to a node tree.
   *
   * @return Twig_Node_Module
   *
   * @throws TwigErrorSyntax When the token stream is syntactically or semantically wrong
   */
  parse(stream) {
    if (null === this.parser) {
      this.parser = new TwigParser(this);
    }

    return this.parser.parse(stream);
  }

  setCompiler(compiler) {
    this.compiler = compiler;
  }

  /**
   * Compiles a node and returns the PHP code.
   *
   * @return {string} The compiled PHP source code
   */
  compile($node) {
    if (null === this.compiler) {
      this.compiler = new TwigCompiler(this);
    }

    return this.compiler.compile($node).getSource();
  }

  /**
   * Compiles a template source code.
   *
   * @return {string} The compiled PHP source code
   *
   * @throws {TwigErrorSyntax} When there was an error during tokenizing, parsing or compiling
   */
  compileSource($source) {
    try {
      return this.compile(this.parse(this.tokenize($source)));
    } catch ($err) {
      if ($err instanceof TwigError) {
        $err.setSourceContext($source);

        throw $err;
      }
      else {
        throw new TwigErrorSyntax(sprintf('An exception has been thrown during the compilation of a template ("%s").', $err.message), -1, $source, $err);
      }
    }
  }

  setLoader(loader) {
    this.loader = loader;
  }

  /**
   * Gets the Loader instance.
   *
   * @return Twig_LoaderInterface
   */
  getLoader() {
    return this.loader;
  }

  /**
   * Sets the default template charset.
   *
   * @param {string} $charset The default charset
   */
  setCharset($charset) {
    if ('UTF8' === ($charset = strtoupper($charset))) {
      // iconv on Windows requires "UTF-8" instead of "UTF8"
      $charset = 'UTF-8';
    }

    this.charset = $charset;
  }

  /**
   * Gets the default template charset.
   *
   * @return string The default charset
   */
  getCharset() {
    return this.charset;
  }

  /**
   * Returns true if the given extension is registered.
   *
   * @param {string} $className The extension class name
   *
   * @return {boolean} Whether the extension is registered or not
   */
  hasExtension($className) {
    return this.extensionSet.hasExtension($className);
  }

  /**
   * Adds a runtime loader.
   */
  addRuntimeLoader($loader) {
    this.runtimeLoaders.push($loader);
  }

  /**
   * Gets an extension by class name.
   *
   * @param {string} $className The extension class name
   *
   * @return {TwigExtensionInterface}
   */
  getExtension($className) {
    return this.extensionSet.getExtension($className);
  }

  /**
   * Returns the runtime implementation of a Twig element (filter/function/test).
   *
   * @param {string} $className A runtime class name
   *
   * @return {Object} The runtime implementation
   *
   * @throws {TwigErrorRuntime} When the template cannot be found
   */
  getRuntime($className) {
    let self = this;

    if (isset(this.runtimes[$className])) {
      return this.runtimes[$className];
    }

    this.runtimeLoaders.forEach(function ($loader) {
      let $runtime = $loader.load($className);

      if (null !== $runtime) {
        return self.runtimes[$className] = $runtime;
      }
    });

    throw new TwigErrorRuntime(sprintf('Unable to load the "%s" runtime.', $className));
  }

  addExtension($extension) {
    this.extensionSet.addExtension($extension);

    this.updateOptionsHash();
  }

  /**
   * Registers an array of extensions.
   *
   * @param {Array} $extensions An array of extensions
   */
  setExtensions($extensions) {
    this.extensionSet.setExtensions($extensions);
  }

  /**
   * Returns all registered extensions.
   *
   * @return Twig_ExtensionInterface[] An array of extensions (keys are for internal usage only and should not be relied on)
   */
  getExtensions() {
    return this.extensionSet.getExtensions();
  }

  addTokenParser($parser) {
    this.extensionSet.addTokenParser($parser);
  }

  /**
   * Gets the registered Token Parsers.
   *
   * @return Twig_TokenParserInterface[]
   *
   * @internal
   */
  getTokenParsers() {
    return this.extensionSet.getTokenParsers();
  }

  /**
   * Gets registered tags.
   *
   * @return {Map<TwigTokenParserInterface>}
   *
   * @internal
   */
  getTags() {
    let $tags = new Map();

    this.getTokenParsers().forEach(function ($parser) {
      $tags.set($parser.getTag(), $parser);
    });

    return $tags;
  }

  addNodeVisitor($visitor) {
    this.extensionSet.addNodeVisitor($visitor);
  }

  /**
   * Gets the registered Node Visitors.
   *
   * @return Twig_NodeVisitorInterface[]
   *
   * @internal
   */
  getNodeVisitors() {
    return this.extensionSet.getNodeVisitors();
  }

  addFilter($filter) {
    this.extensionSet.addFilter($filter);
  }

  /**
   * Get a filter by name.
   *
   * Subclasses may override this method and load filters differently;
   * so no list of filters is available.
   *
   * @param {string} $name The filter name
   *
   * @return Twig_Filter|false A Twig_Filter instance or false if the filter does not exist
   *
   * @internal
   */
  getFilter($name) {
    return this.extensionSet.getFilter($name);
  }

  registerUndefinedFilterCallback($callable) {
    this.extensionSet.registerUndefinedFilterCallback($callable);
  }

  /**
   * Gets the registered Filters.
   *
   * Be warned that this method cannot return filters defined with registerUndefinedFilterCallback.
   *
   * @return Twig_Filter[]
   *
   * @see registerUndefinedFilterCallback
   *
   * @internal
   */
  getFilters() {
    return this.extensionSet.getFilters();
  }

  /**
   * Registers a Test.
   *
   * @param {TwigTest} $test A Twig_Test instance
   */
  addTest($test) {
    this.extensionSet.addTest($test);
  }

  /**
   * Gets the registered Tests.
   *
   * @return {TwigTest[]}
   *
   * @internal
   */
  getTests() {
    return this.extensionSet.getTests();
  }

  /**
   * Gets a test by name.
   *
   * @param {string} $name The test name
   *
   * @return {TwigTest|boolean} A TwigTest instance or false if the test does not exist
   *
   * @internal
   */
  getTest($name) {
    return this.extensionSet.getTest($name);
  }

  addFunction($function) {
    this.extensionSet.addFunction($function);
  }

  /**
   * Get a function by name.
   *
   * Subclasses may override this method and load functions differently;
   * so no list of functions is available.
   *
   * @param {string} $name function name
   *
   * @return {TwigFunction|boolean} A TwigFunction instance or false if the function does not exist
   *
   * @internal
   */
  getFunction($name) {
    return this.extensionSet.getFunction($name);
  }

  registerUndefinedFunctionCallback($callable) {
    this.extensionSet.registerUndefinedFunctionCallback($callable);
  }

  /**
   * Gets registered functions.
   *
   * Be warned that this method cannot return functions defined with registerUndefinedFunctionCallback.
   *
   * @return Twig_Function[]
   *
   * @see registerUndefinedFunctionCallback
   *
   * @internal
   */
  getFunctions() {
    return this.extensionSet.getFunctions();
  }

  /**
   * Registers a Global.
   *
   * New globals can be added before compiling or rendering a template;
   * but after, you can only update existing globals.
   *
   * @param {string}  $name  The global name
   * @param {*}       $value The global value
   */
  addGlobal($name, $value) {
    if (this.extensionSet.isInitialized() && !this.getGlobals().has($name)) {
      throw new Error(sprintf('Unable to add global "%s" as the runtime or the extensions have already been initialized.', $name));
    }

    if (null !== this.resolvedGlobals) {
      this.resolvedGlobals.set($name, $value);
    } else {
      this.globals.set($name, $value);
    }
  }

  /**
   * Gets the registered Globals.
   *
   * @return {Map} An array of globals
   *
   * @internal
   */
  getGlobals() {
    if (this.extensionSet.isInitialized()) {
      if (null === this.resolvedGlobals) {
        this.resolvedGlobals = new Map([...this.extensionSet.getGlobals(), ...this.globals]);
      }

      return this.resolvedGlobals;
    }

    return new Map([...this.extensionSet.getGlobals(), ...this.globals]);
  }

  /**
   * Merges a context with the defined globals.
   *
   * @param {Map} $context An array representing the context
   *
   * @return {Map} The context merged with the globals
   */
  mergeGlobals($context) {
    // we don't use array_merge as the context being generally
    // bigger than globals, this code is faster.
    this.getGlobals().forEach(function ($value, $key) {
      if (!$context.has($key)) {
        $context.set($key, $value);
      }
    });

    return $context;
  }

  /**
   * Gets the registered unary Operators.
   *
   * @return array An array of unary operators
   *
   * @internal
   */
  getUnaryOperators() {
    return this.extensionSet.getUnaryOperators();
  }

  /**
   * Gets the registered binary Operators.
   *
   * @return array An array of binary operators
   *
   * @internal
   */
  getBinaryOperators() {
    return this.extensionSet.getBinaryOperators();
  }

  updateOptionsHash() {
    this.optionsHash = implode(':', array(
      this.extensionSet.getSignature(),
      // PHP_MAJOR_VERSION,
      // PHP_MINOR_VERSION,
      TwigEnvironment.VERSION,
      this.debug,
      this.baseTemplateClass,
      this.strictVariables
    ));
  }
}

TwigEnvironment.VERSION = '2.3.1';
TwigEnvironment.VERSION_ID = 20301;
TwigEnvironment.MAJOR_VERSION = 2;
TwigEnvironment.MINOR_VERSION = 3;
TwigEnvironment.RELEASE_VERSION = 1;
TwigEnvironment.EXTRA_VERSION = 'DEV';

module.exports = TwigEnvironment;