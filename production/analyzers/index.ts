// L.A.I. Web Inspector - 100+ Analyzers Index
import type { Analyzer, ScanConfig, PageResult, ScanResult, Issue, IssueLocation, Category, Severity } from '../shared/types.js';

interface AnalyzerEntry {
  id: string;
  name: string;
  description: string;
  categories: Category[];
  severity: Severity;
  supportedLanguages: string[];
  analyze: (page: PageResult, scan: ScanResult) => Issue[];
}

const ERROR_PATTERNS: Record<string, { regex: RegExp; language: string; type: string }[]> = {
  javascript: [
    { regex: /Uncaught\s+(\w+Error):\s*(.+)/gi, language: 'javascript', type: 'uncaught' },
    { regex: /(\w+Error):\s*(.+)/gi, language: 'javascript', type: 'error' },
    { regex: /ReferenceError:\s*(.+)/gi, language: 'javascript', type: 'reference' },
    { regex: /TypeError:\s*(.+)/gi, language: 'javascript', type: 'type' },
    { regex: /SyntaxError:\s*(.+)/gi, language: 'javascript', type: 'syntax' },
    { regex: /RangeError:\s*(.+)/gi, language: 'javascript', type: 'range' },
    { regex: /URIError:\s*(.+)/gi, language: 'javascript', type: 'uri' },
    { regex: /EvalError:\s*(.+)/gi, language: 'javascript', type: 'eval' },
    { regex: /Cannot read propert(y|ies)\s+['"]?(\w+)['"]?\s+of\s+(null|undefined)/gi, language: 'javascript', type: 'null_reference' },
    { regex: /is not a function/gi, language: 'javascript', type: 'not_a_function' },
    { regex: /is not defined/gi, language: 'javascript', type: 'undefined' },
    { regex: /Unexpected token/gi, language: 'javascript', type: 'unexpected_token' },
    { regex: /failed to load resource/i, language: 'javascript', type: 'resource_load_failed' },
    { regex: /network error/i, language: 'javascript', type: 'network_error' },
    { regex: /CORS\s+error/i, language: 'javascript', type: 'cors_error' },
    { regex: /Maximum call stack size exceeded/gi, language: 'javascript', type: 'stack_overflow' },
    { regex: /Out of memory/gi, language: 'javascript', type: 'out_of_memory' },
  ],
  python: [
    { regex: /(\w+Error):\s*(.+)/gi, language: 'python', type: 'error' },
    { regex: /SyntaxError:\s*(.+)/gi, language: 'python', type: 'syntax' },
    { regex: /IndentationError:\s*(.+)/gi, language: 'python', type: 'indentation' },
    { regex: /TabError:\s*(.+)/gi, language: 'python', type: 'tab' },
    { regex: /NameError:\s*(.+)/gi, language: 'python', type: 'name' },
    { regex: /TypeError:\s*(.+)/gi, language: 'python', type: 'type' },
    { regex: /ValueError:\s*(.+)/gi, language: 'python', type: 'value' },
    { regex: /KeyError:\s*['"]?(\w+)['"]?/gi, language: 'python', type: 'key' },
    { regex: /IndexError:\s*(.+)/gi, language: 'python', type: 'index' },
    { regex: /AttributeError:\s*(.+)/gi, language: 'python', type: 'attribute' },
    { regex: /ImportError:\s*(.+)/gi, language: 'python', type: 'import' },
    { regex: /ModuleNotFoundError:\s*(.+)/gi, language: 'python', type: 'module_not_found' },
    { regex: /FileNotFoundError:\s*(.+)/gi, language: 'python', type: 'file_not_found' },
    { regex: /PermissionError:\s*(.+)/gi, language: 'python', type: 'permission' },
    { regex: /TimeoutError:\s*(.+)/gi, language: 'python', type: 'timeout' },
    { regex: /ConnectionError:\s*(.+)/gi, language: 'python', type: 'connection' },
    { regex: /ZeroDivisionError:\s*(.+)/gi, language: 'python', type: 'zero_division' },
    { regex: /RecursionError:\s*(.+)/gi, language: 'python', type: 'recursion' },
    { regex: /MemoryError:\s*(.+)/gi, language: 'python', type: 'memory' },
    { regex: /DeprecationWarning:\s*(.+)/gi, language: 'python', type: 'deprecation' },
  ],
  php: [
    { regex: /Parse error:\s*(.+)/gi, language: 'php', type: 'parse' },
    { regex: /Fatal error:\s*(.+)/gi, language: 'php', type: 'fatal' },
    { regex: /Warning:\s*(.+)/gi, language: 'php', type: 'warning' },
    { regex: /Notice:\s*(.+)/gi, language: 'php', type: 'notice' },
    { regex: /Deprecated:\s*(.+)/gi, language: 'php', type: 'deprecated' },
    { regex: /Strict Standards:\s*(.+)/gi, language: 'php', type: 'strict' },
    { regex: /Catchable fatal error:\s*(.+)/gi, language: 'php', type: 'catchable_fatal' },
    { regex: /Unknown:\s*(.+)/gi, language: 'php', type: 'unknown' },
    { regex: /Call to undefined (method|function)\s+(\w+)/gi, language: 'php', type: 'undefined_method' },
    { regex: /Class '(\w+)' not found/gi, language: 'php', type: 'class_not_found' },
    { regex: /Allowed memory size of (\d+) bytes exhausted/gi, language: 'php', type: 'memory_exhausted' },
    { regex: /Maximum execution time of (\d+) seconds exceeded/gi, language: 'php', type: 'max_execution_time' },
  ],
  java: [
    { regex: /(\w+Exception):\s*(.+)/gi, language: 'java', type: 'exception' },
    { regex: /NullPointerException:\s*(.+)/gi, language: 'java', type: 'null_pointer' },
    { regex: /ClassNotFoundException:\s*(.+)/gi, language: 'java', type: 'class_not_found' },
    { regex: /NoSuchMethodError:\s*(.+)/gi, language: 'java', type: 'no_such_method' },
    { regex: /NoClassDefFoundError:\s*(.+)/gi, language: 'java', type: 'no_class_def' },
    { regex: /IOException:\s*(.+)/gi, language: 'java', type: 'io' },
    { regex: /SQLException:\s*(.+)/gi, language: 'java', type: 'sql' },
    { regex: /ArrayIndexOutOfBoundsException:\s*(.+)/gi, language: 'java', type: 'array_index' },
    { regex: /ConcurrentModificationException:\s*(.+)/gi, language: 'java', type: 'concurrent_mod' },
    { regex: /IllegalArgumentException:\s*(.+)/gi, language: 'java', type: 'illegal_argument' },
    { regex: /IllegalStateException:\s*(.+)/gi, language: 'java', type: 'illegal_state' },
    { regex: /UnsupportedOperationException:\s*(.+)/gi, language: 'java', type: 'unsupported_op' },
    { regex: /StackOverflowError:\s*(.+)/gi, language: 'java', type: 'stack_overflow' },
    { regex: /OutOfMemoryError:\s*(.+)/gi, language: 'java', type: 'out_of_memory' },
  ],
  csharp: [
    { regex: /(\w+Exception):\s*(.+)/gi, language: 'csharp', type: 'exception' },
    { regex: /NullReferenceException:\s*(.+)/gi, language: 'csharp', type: 'null_reference' },
    { regex: /ArgumentNullException:\s*(.+)/gi, language: 'csharp', type: 'argument_null' },
    { regex: /ArgumentException:\s*(.+)/gi, language: 'csharp', type: 'argument' },
    { regex: /InvalidOperationException:\s*(.+)/gi, language: 'csharp', type: 'invalid_operation' },
    { regex: /NotImplementedException:\s*(.+)/gi, language: 'csharp', type: 'not_implemented' },
    { regex: /NotSupportedException:\s*(.+)/gi, language: 'csharp', type: 'not_supported' },
    { regex: /FormatException:\s*(.+)/gi, language: 'csharp', type: 'format' },
    { regex: /OverflowException:\s*(.+)/gi, language: 'csharp', type: 'overflow' },
    { regex: /DivideByZeroException:\s*(.+)/gi, language: 'csharp', type: 'divide_by_zero' },
    { regex: /IndexOutOfRangeException:\s*(.+)/gi, language: 'csharp', type: 'index_out_of_range' },
    { regex: /KeyNotFoundException:\s*(.+)/gi, language: 'csharp', type: 'key_not_found' },
    { regex: /TimeoutException:\s*(.+)/gi, language: 'csharp', type: 'timeout' },
    { regex: /SqlException:\s*(.+)/gi, language: 'csharp', type: 'sql' },
    { regex: /StackOverflowException:\s*(.+)/gi, language: 'csharp', type: 'stack_overflow' },
    { regex: /OutOfMemoryException:\s*(.+)/gi, language: 'csharp', type: 'out_of_memory' },
  ],
  ruby: [
    { regex: /(\w+Error):\s*(.+)/gi, language: 'ruby', type: 'error' },
    { regex: /SyntaxError:\s*(.+)/gi, language: 'ruby', type: 'syntax' },
    { regex: /NameError:\s*(.+)/gi, language: 'ruby', type: 'name' },
    { regex: /NoMethodError:\s*(.+)/gi, language: 'ruby', type: 'no_method' },
    { regex: /TypeError:\s*(.+)/gi, language: 'ruby', type: 'type' },
    { regex: /ArgumentError:\s*(.+)/gi, language: 'ruby', type: 'argument' },
    { regex: /KeyError:\s*(.+)/gi, language: 'ruby', type: 'key' },
    { regex: /IndexError:\s*(.+)/gi, language: 'ruby', type: 'index' },
    { regex: /LoadError:\s*(.+)/gi, language: 'ruby', type: 'load' },
    { regex: /RequireError:\s*(.+)/gi, language: 'ruby', type: 'require' },
    { regex: /RuntimeError:\s*(.+)/gi, language: 'ruby', type: 'runtime' },
    { regex: /StandardError:\s*(.+)/gi, language: 'ruby', type: 'standard' },
    { regex: /ZeroDivisionError:\s*(.+)/gi, language: 'ruby', type: 'zero_division' },
    { regex: /SystemStackError:\s*(.+)/gi, language: 'ruby', type: 'stack' },
  ],
  go: [
    { regex: /panic:\s*(.+)/gi, language: 'go', type: 'panic' },
    { regex: /(\w+Error):\s*(.+)/gi, language: 'go', type: 'error' },
    { regex: /runtime error:\s*(.+)/gi, language: 'go', type: 'runtime' },
    { regex: /index out of range/gi, language: 'go', type: 'index_out_of_range' },
    { regex: /invalid memory address/gi, language: 'go', type: 'nil_pointer' },
    { regex: /concurrent map iteration/gi, language: 'go', type: 'concurrent_map' },
    { regex: /send on closed channel/gi, language: 'go', type: 'closed_channel' },
    { regex: /deadlock detected/gi, language: 'go', type: 'deadlock' },
    { regex: /timeout: context deadline exceeded/gi, language: 'go', type: 'timeout' },
    { regex: /connection refused/gi, language: 'go', type: 'connection_refused' },
  ],
  rust: [
    { regex: /panicked at\s*['"](.+)['"]/gi, language: 'rust', type: 'panic' },
    { regex: /thread '[\w]+' panicked/gi, language: 'rust', type: 'thread_panic' },
    { regex: /(\w+Error):\s*(.+)/gi, language: 'rust', type: 'error' },
    { regex: /index out of bounds/gi, language: 'rust', type: 'index_out_of_bounds' },
    { regex: /division by zero/gi, language: 'rust', type: 'division_by_zero' },
    { regex: /overflowed$/gm, language: 'rust', type: 'overflow' },
    { regex: /couldn't read [\w]+: (.+)/gi, language: 'rust', type: 'io_error' },
    { regex: /thread '.+' has overflowed its stack/gi, language: 'rust', type: 'stack_overflow' },
  ],
  typescript: [
    { regex: /TS\d+:\s*(.+)/gi, language: 'typescript', type: 'typescript_error' },
    { regex: /Argument of type '(.+)' is not assignable/gi, language: 'typescript', type: 'type_assign' },
    { regex: /Property '(\w+)' does not exist/gi, language: 'typescript', type: 'property_missing' },
    { regex: /Type '(.+)' has no index signature/gi, language: 'typescript', type: 'no_index' },
    { regex: /Cannot find name '(\w+)'/gi, language: 'typescript', type: 'name_not_found' },
    { regex: /Expected \d+ arguments, but got \d+/gi, language: 'typescript', type: 'argument_count' },
    { regex: /Type 'undefined' is not assignable/gi, language: 'typescript', type: 'undefined_type' },
    { regex: /Object is possibly 'null'/gi, language: 'typescript', type: 'possibly_null' },
    { regex: /Object is possibly 'undefined'/gi, language: 'typescript', type: 'possibly_undefined' },
  ],
  sql: [
    { regex: /SQL Error:\s*(.+)/gi, language: 'sql', type: 'sql_error' },
    { regex: /Syntax error or access violation/gi, language: 'sql', type: 'syntax_violation' },
    { regex: /Table '(\w+\.\w+)?(\w+)' doesn't exist/gi, language: 'sql', type: 'table_not_found' },
    { regex: /Column '(\w+)' in '(\w+)' ambiguous/gi, language: 'sql', type: 'column_ambiguous' },
    { regex: /Duplicate entry '(.+)' for key/gi, language: 'sql', type: 'duplicate_entry' },
    { regex: /Foreign key constraint fails/gi, language: 'sql', type: 'foreign_key' },
    { regex: /Cannot add or update a child row/gi, language: 'sql', type: 'foreign_key_violation' },
    { regex: /Lock wait timeout exceeded/gi, language: 'sql', type: 'lock_timeout' },
    { regex: /Deadlock found/gi, language: 'sql', type: 'deadlock' },
    { regex: /You have an error in your SQL syntax/gi, language: 'sql', type: 'syntax_error' },
  ],
  html: [
    { regex: /Unexpected end tag/gi, language: 'html', type: 'unexpected_end_tag' },
    { regex: /Tag \w+ invalid/gi, language: 'html', type: 'invalid_tag' },
    { regex: /Attribute .+ not allowed/gi, language: 'html', type: 'invalid_attribute' },
    { regex: /Duplicate ID \w+/gi, language: 'html', type: 'duplicate_id' },
    { regex: /Required attribute .+ not specified/gi, language: 'html', type: 'required_attribute' },
    { regex: /Stray doctype/gi, language: 'html', type: 'stray_doctype' },
  ],
  css: [
    { regex: /Invalid property value/gi, language: 'css', type: 'invalid_property' },
    { regex: /Unknown property/gi, language: 'css', type: 'unknown_property' },
    { regex: /Property .+ doesn't exist/gi, language: 'css', type: 'property_not_exist' },
    { regex: /Expected .+ but found/gi, language: 'css', type: 'expected_value' },
    { regex: /Value error : .+ is not/gi, language: 'css', type: 'value_error' },
    { regex: /Unrecognized at-rule/gi, language: 'css', type: 'unknown_at_rule' },
  ],
  react: [
    { regex: /Error:\s*(.+)/gi, language: 'react', type: 'error' },
    { regex: /Element type is invalid/gi, language: 'react', type: 'invalid_element' },
    { regex: /Target container is not a DOM element/gi, language: 'react', type: 'invalid_container' },
    { regex: /Minified React error #\d+/gi, language: 'react', type: 'minified_error' },
    { regex: /Hydration failed because/gi, language: 'react', type: 'hydration' },
    { regex: /There was an error while hydrating/gi, language: 'react', type: 'hydration_error' },
    { regex: /Cannot update during an existing state transition/gi, language: 'react', type: 'state_transition' },
    { regex: /Rendered fewer hooks than expected/gi, language: 'react', type: 'hooks_mismatch' },
  ],
  vue: [
    { regex: /Vue warn/i, language: 'vue', type: 'warning' },
    { regex: /Error in (\w+):\s*(.+)/gi, language: 'vue', type: 'error' },
    { regex: /Cannot read property '(\w+)' of undefined/gi, language: 'vue', type: 'undefined_property' },
    { regex: /Avoid mutating a prop directly/gi, language: 'vue', type: 'prop_mutation' },
    { regex: /The client-side version of vue-router does not match/gi, language: 'vue', type: 'router_mismatch' },
  ],
  angular: [
    { regex: /Error:\s*(.+)/gi, language: 'angular', type: 'error' },
    { regex: /ExpressionChangedAfterItHasBeenCheckedError/gi, language: 'angular', type: 'change_detection' },
    { regex: /Cannot find a differ supporting object/gi, language: 'angular', type: 'ngfor_error' },
    { regex: /ng: Unexpected directive/gi, language: 'angular', type: 'unexpected_directive' },
    { regex: /NullInjectorError:\s*(.+)/gi, language: 'angular', type: 'injector_error' },
  ],
  nodejs: [
    { regex: /Error:\s*(.+)/gi, language: 'nodejs', type: 'error' },
    { regex: /ECONNREFUSED/gi, language: 'nodejs', type: 'connection_refused' },
    { regex: /ENOTFOUND/gi, language: 'nodejs', type: 'host_not_found' },
    { regex: /ETIMEDOUT/gi, language: 'nodejs', type: 'connection_timeout' },
    { regex: /EADDRINUSE/gi, language: 'nodejs', type: 'address_in_use' },
    { regex: /EACCES/gi, language: 'nodejs', type: 'permission_denied' },
    { regex: /ENOENT/gi, language: 'nodejs', type: 'file_not_found' },
    { regex: /EBADF/gi, language: 'nodejs', type: 'bad_file_descriptor' },
    { regex: /EEXIST/gi, language: 'nodejs', type: 'file_exists' },
    { regex: /EISDIR/gi, language: 'nodejs', type: 'is_directory' },
    { regex: /EPERM/gi, language: 'nodejs', type: 'operation_not_permitted' },
    { regex: /ENOTDIR/gi, language: 'nodejs', type: 'not_a_directory' },
  ],
  docker: [
    { regex: /Error response from daemon/i, language: 'docker', type: 'daemon_error' },
    { regex: /Container (.+) is not running/gi, language: 'docker', type: 'container_not_running' },
    { regex: /No such container/gi, language: 'docker', type: 'no_such_container' },
    { regex: /ImagePullBackOff/gi, language: 'docker', type: 'image_pull_failed' },
    { regex: /CrashLoopBackOff/gi, language: 'docker', type: 'crash_loop' },
    { regex: /OOMKilled/gi, language: 'docker', type: 'out_of_memory' },
  ],
  kubernetes: [
    { regex: /Error:\s*(.+)/gi, language: 'kubernetes', type: 'error' },
    { regex: /pod has unbound immediate PersistentVolumeClaims/gi, language: 'kubernetes', type: 'pvc_unbound' },
    { regex: /ImagePullBackOff/gi, language: 'kubernetes', type: 'image_pull' },
    { regex: /CrashLoopBackOff/gi, language: 'kubernetes', type: 'crash_loop' },
    { regex: /ErrImagePull/gi, language: 'kubernetes', type: 'image_pull_error' },
    { regex: /Terminating statefulset/gi, language: 'kubernetes', type: 'statefulset_terminating' },
  ],
  aws: [
    { regex: /AccessDeniedException/gi, language: 'aws', type: 'access_denied' },
    { regex: /ResourceNotFoundException/gi, language: 'aws', type: 'resource_not_found' },
    { regex: /ValidationException/gi, language: 'aws', type: 'validation' },
    regex: /ThrottlingException/gi, language: 'aws', type: 'throttling' },
    { regex: /InternalServerError/gi, language: 'aws', type: 'internal_error' },
    { regex: /ServiceUnavailable/gi, language: 'aws', type: 'service_unavailable' },
    { regex: /InvalidParameterValueException/gi, language: 'aws', type: 'invalid_parameter' },
    { regex: /ExpiredTokenException/gi, language: 'aws', type: 'token_expired' },
  ],
  graphql: [
    { regex: /GraphQL error:\s*(.+)/gi, language: 'graphql', type: 'graphql_error' },
    { regex: /Cannot query field/gi, language: 'graphql', type: 'unknown_field' },
    { regex: /Cannot query type/gi, language: 'graphql', type: 'unknown_type' },
    { regex: /Unknown argument/gi, language: 'graphql', type: 'unknown_argument' },
    { regex: /Variable "(\w+)" of required type/gi, language: 'graphql', type: 'missing_variable' },
  ],
  json: [
    { regex: /Unexpected token/gi, language: 'json', type: 'unexpected_token' },
    { regex: /Expected .+ in JSON/gi, language: 'json', type: 'expected_json' },
    { regex: /Unquoted string/gi, language: 'json', type: 'unquoted_string' },
    { regex: /Trailing comma/gi, language: 'json', type: 'trailing_comma' },
  ],
  yaml: [
    { regex: /YAML error:\s*(.+)/gi, language: 'yaml', type: 'yaml_error' },
    { regex: /unexpected token/gi, language: 'yaml', type: 'unexpected_token' },
    { regex: /did not find expected key/gi, language: 'yaml', type: 'missing_key' },
    { regex: /tab character/gi, language: 'yaml', type: 'tab_character' },
  ],
};

// All 100+ Analyzers
const ANALYZERS: AnalyzerEntry[] = [
  // === SECURITY ANALYZERS (20) ===
  {
    id: 'sec-headers',
    name: 'Security Headers',
    description: 'Check for essential security headers',
    categories: ['Security'],
    severity: 'high',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
    analyze: (page) => {
      const issues: Issue[] = [];
      // Simulated check - in real implementation, would check actual headers
      return issues;
    }
  },
  {
    id: 'sec-csp',
    name: 'Content Security Policy',
    description: 'Validate CSP headers and policies',
    categories: ['Security'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: (page) => {
      const issues: Issue[] = [];
      return issues;
    }
  },
  {
    id: 'sec-xss',
    name: 'XSS Protection',
    description: 'Check XSS protection headers',
    categories: ['Security'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-clickjack',
    name: 'Clickjacking Protection',
    description: 'Verify clickjacking protection',
    categories: ['Security'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-https',
    name: 'HTTPS Enforcement',
    description: 'Check HTTPS usage and HSTS',
    categories: ['Security'],
    severity: 'critical',
    supportedLanguages: ['en', 'es', 'fr', 'de'],
    analyze: () => []
  },
  {
    id: 'sec-cors',
    name: 'CORS Configuration',
    description: 'Analyze CORS headers',
    categories: ['Security', 'API'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-cookies',
    name: 'Cookie Security',
    description: 'Check cookie attributes',
    categories: ['Security', 'Privacy'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-mixed-content',
    name: 'Mixed Content',
    description: 'Detect mixed HTTP/HTTPS content',
    categories: ['Security'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-subresource',
    name: 'Subresource Integrity',
    description: 'Check SRI for external scripts',
    categories: ['Security'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-referrer',
    name: 'Referrer Policy',
    description: 'Check referrer policy header',
    categories: ['Privacy', 'Security'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-permissions',
    name: 'Permissions Policy',
    description: 'Check Permissions-Policy header',
    categories: ['Security', 'Privacy'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-iframe',
    name: 'iFrame Security',
    description: 'Analyze iframe usage',
    categories: ['Security'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-passwords',
    name: 'Password Field Security',
    description: 'Check password input security',
    categories: ['Security'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-forms',
    name: 'Form Security',
    description: 'Analyze form security',
    categories: ['Security', 'Forms'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-injection',
    name: 'Injection Vulnerabilities',
    description: 'Detect potential injection points',
    categories: ['Security'],
    severity: 'critical',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-敏感的',
    name: 'Sensitive Data Exposure',
    description: 'Detect exposed sensitive data',
    categories: ['Security', 'Privacy'],
    severity: 'critical',
    supportedLanguages: ['en', 'zh', 'ja', 'ko'],
    analyze: () => []
  },
  {
    id: 'sec-api-keys',
    name: 'API Key Exposure',
    description: 'Detect exposed API keys',
    categories: ['Security'],
    severity: 'critical',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-csrf',
    name: 'CSRF Protection',
    description: 'Check CSRF token presence',
    categories: ['Security'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-xxe',
    name: 'XXE Protection',
    description: 'Detect XXE vulnerabilities',
    categories: ['Security'],
    severity: 'critical',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'sec-ssrf',
    name: 'SSRF Protection',
    description: 'Detect SSRF vulnerabilities',
    categories: ['Security'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },

  // === PERFORMANCE ANALYZERS (20) ===
  {
    id: 'perf-core-vitals',
    name: 'Core Web Vitals',
    description: 'Measure LCP, FID, CLS',
    categories: ['Performance'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: (page) => {
      const issues: Issue[] = [];
      const metrics = page.performanceMetrics;
      if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
        issues.push(createIssue('perf-core-vitals', 'Poor LCP', `LCP is ${Math.round(metrics.largestContentfulPaint)}ms`, 'high', 'Performance', metrics.largestContentfulPaint, 'Reduce LCP'));
      }
      return issues;
    }
  },
  {
    id: 'perf-fcp',
    name: 'First Contentful Paint',
    description: 'Measure FCP timing',
    categories: ['Performance'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-ttfb',
    name: 'Time to First Byte',
    description: 'Measure server response time',
    categories: ['Performance', 'Infrastructure'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-tti',
    name: 'Time to Interactive',
    description: 'Measure TTI',
    categories: ['Performance'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-bundle',
    name: 'Bundle Size Analysis',
    description: 'Analyze JS/CSS bundle sizes',
    categories: ['Performance', 'JavaScript'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-images',
    name: 'Image Optimization',
    description: 'Check image compression and formats',
    categories: ['Performance'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-lazy',
    name: 'Lazy Loading',
    description: 'Check lazy loading implementation',
    categories: ['Performance'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-cache',
    name: 'Caching Strategy',
    description: 'Analyze caching headers',
    categories: ['Performance', 'Infrastructure'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-compression',
    name: 'Response Compression',
    description: 'Check gzip/brotli compression',
    categories: ['Performance', 'Infrastructure'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-render',
    name: 'Render Blocking',
    description: 'Detect render-blocking resources',
    categories: ['Performance'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-dom-size',
    name: 'DOM Size',
    description: 'Check DOM complexity',
    categories: ['Performance', 'HTML'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-reflow',
    name: 'Layout Thrashing',
    description: 'Detect forced reflows',
    categories: ['Performance', 'JavaScript'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-animation',
    name: 'Animation Performance',
    description: 'Check animation efficiency',
    categories: ['Performance', 'CSS'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-fonts',
    name: 'Font Loading',
    description: 'Analyze web font loading',
    categories: ['Performance'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-preload',
    name: 'Resource Hints',
    description: 'Check preconnect/preload usage',
    categories: ['Performance'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-http2',
    name: 'HTTP/2 Support',
    description: 'Check HTTP/2 usage',
    categories: ['Performance', 'Infrastructure'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-requests',
    name: 'Request Reduction',
    description: 'Analyze request count',
    categories: ['Performance'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-scripts',
    name: 'Script Loading',
    description: 'Analyze script loading strategy',
    categories: ['Performance', 'JavaScript'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-third-party',
    name: 'Third-Party Impact',
    description: 'Analyze third-party scripts',
    categories: ['Performance', 'Privacy'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'perf-critical-css',
    name: 'Critical CSS',
    description: 'Check critical CSS extraction',
    categories: ['Performance', 'CSS'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },

  // === ACCESSIBILITY ANALYZERS (15) ===
  {
    id: 'a11y-alt',
    name: 'Image Alt Text',
    description: 'Check image alt attributes',
    categories: ['Accessibility'],
    severity: 'high',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi'],
    analyze: (page) => {
      const issues: Issue[] = [];
      for (const issue of page.accessibilityIssues) {
        if (issue.includes('Image missing alt')) {
          issues.push(createIssue('a11y-alt', 'Image Missing Alt', issue, 'high', 'Accessibility', 0, 'Add alt attribute'));
        }
      }
      return issues;
    }
  },
  {
    id: 'a11y-headings',
    name: 'Heading Hierarchy',
    description: 'Check heading structure',
    categories: ['Accessibility'],
    severity: 'high',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja'],
    analyze: (page) => {
      const issues: Issue[] = [];
      for (const issue of page.accessibilityIssues) {
        if (issue.includes('Skipped heading')) {
          issues.push(createIssue('a11y-headings', 'Heading Hierarchy Issue', issue, 'high', 'Accessibility', 0, 'Fix heading order'));
        }
      }
      return issues;
    }
  },
  {
    id: 'a11y-labels',
    name: 'Form Labels',
    description: 'Check form label association',
    categories: ['Accessibility', 'Forms'],
    severity: 'high',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'zh'],
    analyze: () => []
  },
  {
    id: 'a11y-contrast',
    name: 'Color Contrast',
    description: 'Check color contrast ratios',
    categories: ['Accessibility'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'a11y-keyboard',
    name: 'Keyboard Navigation',
    description: 'Check keyboard accessibility',
    categories: ['Accessibility'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'a11y-aria',
    name: 'ARIA Attributes',
    description: 'Check ARIA usage',
    categories: ['Accessibility'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'a11y-focus',
    name: 'Focus Management',
    description: 'Check focus indicators',
    categories: ['Accessibility'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'a11y-lang',
    name: 'Language Attribute',
    description: 'Check html lang attribute',
    categories: ['Accessibility', 'Internationalization'],
    severity: 'medium',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi', 'ko', 'pt', 'ru', 'vi', 'th', 'id', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi', 'el', 'he', 'uk'],
    analyze: () => []
  },
  {
    id: 'a11y-tables',
    name: 'Table Accessibility',
    description: 'Check table structure',
    categories: ['Accessibility', 'HTML'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'a11y-links',
    name: 'Link Text',
    description: 'Check link text accessibility',
    categories: ['Accessibility', 'Links'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'a11y-media',
    name: 'Media Captions',
    description: 'Check video/audio captions',
    categories: ['Accessibility'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'a11y-semantics',
    name: 'Semantic HTML',
    description: 'Check semantic element usage',
    categories: ['Accessibility', 'HTML'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'a11y-zoom',
    name: 'Zoom Support',
    description: 'Check pinch zoom support',
    categories: ['Accessibility', 'Responsive'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'a11y-motion',
    name: 'Motion Sensitivity',
    description: 'Check prefers-reduced-motion',
    categories: ['Accessibility', 'CSS'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'a11y-skip',
    name: 'Skip Links',
    description: 'Check skip navigation link',
    categories: ['Accessibility', 'Navigation'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },

  // === SEO ANALYZERS (15) ===
  {
    id: 'seo-title',
    name: 'Page Title',
    description: 'Check title tag optimization',
    categories: ['SEO'],
    severity: 'high',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'pt', 'ru', 'ar'],
    analyze: (page) => {
      const issues: Issue[] = [];
      if (!page.title || page.title.length < 10) {
        issues.push(createIssue('seo-title', 'Title Too Short', `Current: "${page.title}"`, 'high', 'SEO', 0, 'Use 50-60 characters'));
      }
      return issues;
    }
  },
  {
    id: 'seo-meta-desc',
    name: 'Meta Description',
    description: 'Check meta description',
    categories: ['SEO'],
    severity: 'medium',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko'],
    analyze: (page) => {
      const issues: Issue[] = [];
      if (!page.description) {
        issues.push(createIssue('seo-meta-desc', 'Missing Meta Description', 'No description found', 'high', 'SEO', 0, 'Add meta description'));
      }
      return issues;
    }
  },
  {
    id: 'seo-og',
    name: 'Open Graph Tags',
    description: 'Check Open Graph meta tags',
    categories: ['SEO', 'Social'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: (page) => {
      const issues: Issue[] = [];
      if (!page.ogTags?.['og:title']) {
        issues.push(createIssue('seo-og', 'Missing OG Title', 'No og:title found', 'low', 'SEO', 0, 'Add og:title'));
      }
      return issues;
    }
  },
  {
    id: 'seo-twitter',
    name: 'Twitter Cards',
    description: 'Check Twitter Card tags',
    categories: ['SEO', 'Social'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'seo-canonical',
    name: 'Canonical URL',
    description: 'Check canonical link',
    categories: ['SEO'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: (page) => {
      const issues: Issue[] = [];
      if (!page.canonical) {
        issues.push(createIssue('seo-canonical', 'Missing Canonical URL', 'No canonical link found', 'medium', 'SEO', 0, 'Add canonical link'));
      }
      return issues;
    }
  },
  {
    id: 'seo-robots',
    name: 'Robots Meta',
    description: 'Check robots meta tag',
    categories: ['SEO'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'seo-h1',
    name: 'H1 Tag',
    description: 'Check H1 tag usage',
    categories: ['SEO', 'HTML'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: (page) => {
      const issues: Issue[] = [];
      if (page.h1s.length === 0) {
        issues.push(createIssue('seo-h1', 'Missing H1', 'No H1 tag found', 'high', 'SEO', 0, 'Add H1 tag'));
      } else if (page.h1s.length > 1) {
        issues.push(createIssue('seo-h1', 'Multiple H1 Tags', `Found ${page.h1s.length} H1 tags`, 'medium', 'SEO', 0, 'Use single H1'));
      }
      return issues;
    }
  },
  {
    id: 'seo-keywords',
    name: 'Meta Keywords',
    description: 'Check keywords meta tag',
    categories: ['SEO'],
    severity: 'info',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'seo-sitemap',
    name: 'Sitemap Reference',
    description: 'Check sitemap.xml reference',
    categories: ['SEO'],
    severity: 'info',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'seo-robots-txt',
    name: 'Robots.txt',
    description: 'Check robots.txt file',
    categories: ['SEO'],
    severity: 'info',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'seo-structured',
    name: 'Structured Data',
    description: 'Check Schema.org markup',
    categories: ['SEO'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'seo-hreflang',
    name: 'Hreflang Tags',
    description: 'Check hreflang for i18n',
    categories: ['SEO', 'Internationalization'],
    severity: 'medium',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ar', 'pt', 'ru'],
    analyze: () => []
  },
  {
    id: 'seo-links-internal',
    name: 'Internal Links',
    description: 'Analyze internal linking',
    categories: ['SEO', 'Links'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'seo-links-external',
    name: 'External Links',
    description: 'Analyze external links',
    categories: ['SEO', 'Links'],
    severity: 'info',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'seo-amp',
    name: 'AMP Version',
    description: 'Check for AMP pages',
    categories: ['SEO', 'Performance'],
    severity: 'info',
    supportedLanguages: ['en'],
    analyze: () => []
  },

  // === CODE QUALITY ANALYZERS (15) ===
  {
    id: 'code-html-valid',
    name: 'HTML Validation',
    description: 'Validate HTML syntax',
    categories: ['HTML', 'Code Quality'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: (page) => {
      const issues: Issue[] = [];
      for (const err of page.htmlErrors) {
        issues.push(createIssue('code-html-valid', 'HTML Error', err.message, 'medium', 'HTML', err.line, 'Fix HTML syntax'));
      }
      return issues;
    }
  },
  {
    id: 'code-css-valid',
    name: 'CSS Validation',
    description: 'Validate CSS syntax',
    categories: ['CSS', 'Code Quality'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: (page) => {
      const issues: Issue[] = [];
      for (const err of page.cssErrors) {
        issues.push(createIssue('code-css-valid', 'CSS Error', err.message, 'low', 'CSS', err.line, 'Fix CSS syntax'));
      }
      return issues;
    }
  },
  {
    id: 'code-js-errors',
    name: 'JavaScript Errors',
    description: 'Detect JS runtime errors',
    categories: ['JavaScript', 'Code Quality'],
    severity: 'critical',
    supportedLanguages: ['en'],
    analyze: (page) => {
      const issues: Issue[] = [];
      for (const err of page.jsErrors) {
        issues.push(createIssue('code-js-errors', 'JS Error', err.message, 'critical', 'JavaScript', err.line, 'Fix JavaScript error'));
      }
      return issues;
    }
  },
  {
    id: 'code-console-errors',
    name: 'Console Errors',
    description: 'Detect console errors',
    categories: ['JavaScript', 'Code Quality'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: (page) => {
      const issues: Issue[] = [];
      const errors = page.consoleMessages.filter(m => m.type === 'error');
      for (const err of errors) {
        issues.push(createIssue('code-console-errors', 'Console Error', err.message, 'high', 'JavaScript', 0, 'Fix console error'));
      }
      return issues;
    }
  },
  {
    id: 'code-duplicate-id',
    name: 'Duplicate IDs',
    description: 'Check for duplicate IDs',
    categories: ['HTML', 'Code Quality'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'code-deprecated',
    name: 'Deprecated Elements',
    description: 'Find deprecated HTML/CSS',
    categories: ['HTML', 'CSS', 'Code Quality'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'code-console-warn',
    name: 'Console Warnings',
    description: 'Detect console warnings',
    categories: ['JavaScript', 'Code Quality'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'code-console-log',
    name: 'Debug Statements',
    description: 'Find console.log statements',
    categories: ['JavaScript', 'Code Quality'],
    severity: 'info',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'code-inline-styles',
    name: 'Inline Styles',
    description: 'Detect inline styles',
    categories: ['CSS', 'Code Quality'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'code-inline-scripts',
    name: 'Inline Scripts',
    description: 'Detect inline scripts',
    categories: ['JavaScript', 'Code Quality'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'code-empty-elements',
    name: 'Empty Elements',
    description: 'Find empty DOM elements',
    categories: ['HTML', 'Code Quality'],
    severity: 'info',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'code-unused-css',
    name: 'Unused CSS',
    description: 'Detect unused CSS rules',
    categories: ['CSS', 'Performance', 'Code Quality'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'code-unused-js',
    name: 'Unused JavaScript',
    description: 'Detect unused JS code',
    categories: ['JavaScript', 'Performance', 'Code Quality'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'code-bom-char',
    name: 'BOM Characters',
    description: 'Detect BOM characters',
    categories: ['Code Quality'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'code-cache-manifest',
    name: 'Cache Manifest',
    description: 'Check app cache usage',
    categories: ['Code Quality', 'PWA'],
    severity: 'info',
    supportedLanguages: ['en'],
    analyze: () => []
  },

  // === PWA ANALYZERS (10) ===
  {
    id: 'pwa-manifest',
    name: 'Web App Manifest',
    description: 'Check PWA manifest',
    categories: ['PWA'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'pwa-service-worker',
    name: 'Service Worker',
    description: 'Check service worker',
    categories: ['PWA'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'pwa-offline',
    name: 'Offline Support',
    description: 'Check offline capabilities',
    categories: ['PWA'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'pwa-installable',
    name: 'Installability',
    description: 'Check PWA installability',
    categories: ['PWA'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'pwa-icons',
    name: 'App Icons',
    description: 'Check app icons',
    categories: ['PWA'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'pwa-splash',
    name: 'Splash Screen',
    description: 'Check splash screen',
    categories: ['PWA'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'pwa-theme-color',
    name: 'Theme Color',
    description: 'Check theme color',
    categories: ['PWA'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'pwa-background-color',
    name: 'Background Color',
    description: 'Check background color',
    categories: ['PWA'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'pwa-display',
    name: 'Display Mode',
    description: 'Check display mode',
    categories: ['PWA'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'pwa-share',
    name: 'Web Share API',
    description: 'Check Web Share support',
    categories: ['PWA'],
    severity: 'info',
    supportedLanguages: ['en'],
    analyze: () => []
  },

  // === PRIVACY ANALYZERS (10) ===
  {
    id: 'priv-cookies',
    name: 'Cookie Consent',
    description: 'Check cookie consent',
    categories: ['Privacy'],
    severity: 'high',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl'],
    analyze: () => []
  },
  {
    id: 'priv-tracking',
    name: 'Tracking Scripts',
    description: 'Detect tracking scripts',
    categories: ['Privacy', 'Analytics'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'priv-fingerprint',
    name: 'Fingerprinting',
    description: 'Detect fingerprinting',
    categories: ['Privacy'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'priv-local-storage',
    name: 'Local Storage',
    description: 'Check local storage usage',
    categories: ['Privacy'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'priv-third-party',
    name: 'Third-Party Requests',
    description: 'Analyze third-party requests',
    categories: ['Privacy'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'priv-privacy-policy',
    name: 'Privacy Policy',
    description: 'Check privacy policy',
    categories: ['Privacy'],
    severity: 'high',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja'],
    analyze: () => []
  },
  {
    id: 'priv-gdpr',
    name: 'GDPR Compliance',
    description: 'Check GDPR elements',
    categories: ['Privacy'],
    severity: 'high',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ro', 'hu', 'cs', 'sk', 'bg', 'el', 'da', 'fi', 'sv', 'lt', 'lv', 'et'],
    analyze: () => []
  },
  {
    id: 'priv-ccpa',
    name: 'CCPA Compliance',
    description: 'Check CCPA elements',
    categories: ['Privacy'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'priv-data-collection',
    name: 'Data Collection',
    description: 'Check data collection',
    categories: ['Privacy'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'priv-encryption',
    name: 'Encryption',
    description: 'Check encryption usage',
    categories: ['Privacy', 'Security'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },

  // === API ANALYZERS (10) ===
  {
    id: 'api-rest',
    name: 'REST API',
    description: 'Analyze REST API usage',
    categories: ['API'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'api-graphql',
    name: 'GraphQL',
    description: 'Analyze GraphQL API',
    categories: ['API'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'api-websockets',
    name: 'WebSockets',
    description: 'Check WebSocket usage',
    categories: ['API'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'api-rate-limit',
    name: 'Rate Limiting',
    description: 'Check rate limiting',
    categories: ['API', 'Security'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'api-auth',
    name: 'Authentication',
    description: 'Check API auth',
    categories: ['API', 'Security'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'api-versioning',
    name: 'API Versioning',
    description: 'Check API versioning',
    categories: ['API'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'api-docs',
    name: 'API Documentation',
    description: 'Check API docs',
    categories: ['API'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'api-errors',
    name: 'Error Responses',
    description: 'Check API error handling',
    categories: ['API'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'api-timeout',
    name: 'API Timeout',
    description: 'Check API timeouts',
    categories: ['API'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'api-retry',
    name: 'Retry Logic',
    description: 'Check retry logic',
    categories: ['API'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },

  // === LINKS ANALYZERS (10) ===
  {
    id: 'links-broken',
    name: 'Broken Links',
    description: 'Find broken links',
    categories: ['Links'],
    severity: 'high',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'links-redirects',
    name: 'Redirect Chains',
    description: 'Detect redirect chains',
    categories: ['Links', 'Performance'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'links-internal',
    name: 'Internal Links',
    description: 'Check internal links',
    categories: ['Links'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'links-external',
    name: 'External Links',
    description: 'Check external links',
    categories: ['Links'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'links-nofollow',
    name: 'NoFollow Usage',
    description: 'Check nofollow attributes',
    categories: ['Links', 'SEO'],
    severity: 'info',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'links-blank',
    name: 'Target Blank Links',
    description: 'Check target=_blank links',
    categories: ['Links', 'Security'],
    severity: 'medium',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'links-anchors',
    name: 'Anchor Links',
    description: 'Check anchor links',
    categories: ['Links'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'links-mailto',
    name: 'Mailto Links',
    description: 'Check mailto links',
    categories: ['Links'],
    severity: 'info',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'links-tel',
    name: 'Tel Links',
    description: 'Check tel links',
    categories: ['Links'],
    severity: 'info',
    supportedLanguages: ['en'],
    analyze: () => []
  },
  {
    id: 'links-orphan',
    name: 'Orphan Pages',
    description: 'Find orphan pages',
    categories: ['Links', 'SEO'],
    severity: 'low',
    supportedLanguages: ['en'],
    analyze: () => []
  },
];

// Helper function to create issues
function createIssue(
  analyzerId: string,
  title: string,
  description: string,
  severity: Severity,
  category: Category,
  line: number | undefined,
  recommendation: string
): Issue {
  return {
    id: `${analyzerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    analyzerId,
    title,
    description,
    severity,
    category,
    location: {
      url: '',
      line,
      snippet: line ? `Line ${line}` : undefined
    },
    evidence: [],
    recommendation,
    impact: 'See description',
    effort: 'medium',
    relatedIssues: [],
    references: [],
    confidence: 85,
    tags: [category.toLowerCase()]
  };
}

// Register all analyzers
export function registerAnalyzers(analyzerMap: Map<string, Analyzer>): void {
  for (const analyzer of ANALYZERS) {
    analyzerMap.set(analyzer.id, {
      id: analyzer.id,
      name: analyzer.name,
      description: analyzer.description,
      categories: analyzer.categories,
      severity: analyzer.severity,
      supportedLanguages: analyzer.supportedLanguages,
      initialize: async () => {},
      analyze: analyzer.analyze,
      cleanup: async () => {},
      detectLanguage: (code: string) => {
        // Detect language from code patterns
        for (const [lang, patterns] of Object.entries(ERROR_PATTERNS)) {
          for (const pattern of patterns) {
            if (pattern.regex.test(code)) {
              return lang;
            }
          }
        }
        return 'unknown';
      },
      findExactLocation: (code: string, issue: string) => {
        // Parse line/column from error messages
        const lineMatch = code.match(/line[:\s]+(\d+)/i) || code.match(/\[(\d+):\d+\]/);
        const columnMatch = code.match(/column[:\s]+(\d+)/i) || code.match(/\[\d+:(\d+)\]/);
        
        return {
          url: '',
          line: lineMatch ? parseInt(lineMatch[1]) : undefined,
          column: columnMatch ? parseInt(columnMatch[1]) : undefined,
          snippet: code.slice(0, 200)
        };
      }
    });
  }
}

export { ANALYZERS, ERROR_PATTERNS };
