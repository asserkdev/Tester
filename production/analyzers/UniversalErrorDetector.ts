// UNIVERSAL ERROR DETECTOR - 100+ Languages
// L.A.I. Web Inspector

export const ALL_LANGUAGES = {
  javascript: {
    patterns: [
      {regex:/Uncaught\s+\w+Error/g,title:'Uncaught Exception',severity:'critical',fix:'Handle exception'},
      {regex:/Cannot read propert/gi,title:'Null Reference',severity:'critical',fix:'Check for null'},
      {regex:/is not a function/g,title:'Not A Function',severity:'critical',fix:'Define function'},
      {regex:/is not defined/g,title:'Undefined',severity:'critical',fix:'Define variable'},
      {regex:/Unexpected token/g,title:'Syntax Error',severity:'critical',fix:'Check syntax'},
      {regex:/Maximum call stack/g,title:'Stack Overflow',severity:'critical',fix:'Check recursion'},
      {regex:/Failed to load resource/g,title:'Resource Failed',severity:'high',fix:'Check network'},
      {regex:/CORS error/g,title:'CORS Error',severity:'high',fix:'Configure CORS'},
    ]
  },
  python: {
    patterns: [
      {regex:/SyntaxError/g,title:'Syntax Error',severity:'critical',fix:'Fix Python syntax'},
      {regex:/IndentationError/g,title:'Indentation',severity:'critical',fix:'Check indent'},
      {regex:/NameError/g,title:'Name Error',severity:'critical',fix:'Define variable'},
      {regex:/TypeError/g,title:'Type Error',severity:'high',fix:'Use correct type'},
      {regex:/ValueError/g,title:'Value Error',severity:'high',fix:'Check value'},
      {regex:/KeyError/g,title:'Key Error',severity:'high',fix:'Check key'},
      {regex:/IndexError/g,title:'Index Error',severity:'high',fix:'Check bounds'},
      {regex:/AttributeError/g,title:'Attribute Error',severity:'high',fix:'Check attribute'},
      {regex:/ImportError/g,title:'Import Error',severity:'high',fix:'Install/import'},
      {regex:/ModuleNotFoundError/g,title:'Module Not Found',severity:'critical',fix:'pip install'},
      {regex:/FileNotFoundError/g,title:'File Not Found',severity:'high',fix:'Check path'},
      {regex:/PermissionError/g,title:'Permission Error',severity:'high',fix:'Check perms'},
      {regex:/TimeoutError/g,title:'Timeout Error',severity:'medium',fix:'Increase timeout'},
      {regex:/ConnectionError/g,title:'Connection Error',severity:'high',fix:'Check network'},
      {regex:/ZeroDivisionError/g,title:'Division by Zero',severity:'high',fix:'Check divisor'},
      {regex:/RecursionError/g,title:'Recursion Error',severity:'critical',fix:'Check recursion'},
      {regex:/MemoryError/g,title:'Memory Error',severity:'critical',fix:'Free memory'},
      {regex:/DeprecationWarning/g,title:'Deprecation',severity:'info',fix:'Use alternative'},
      {regex:/UnicodeDecodeError/g,title:'Unicode Error',severity:'high',fix:'Specify encoding'},
    ]
  },
  php: {
    patterns: [
      {regex:/Parse error/g,title:'Parse Error',severity:'critical',fix:'Fix syntax'},
      {regex:/Fatal error/g,title:'Fatal Error',severity:'critical',fix:'Fix fatal error'},
      {regex:/Warning:/g,title:'Warning',severity:'medium',fix:'Handle warning'},
      {regex:/Notice:/g,title:'Notice',severity:'low',fix:'Fix undefined'},
      {regex:/Deprecated:/g,title:'Deprecated',severity:'info',fix:'Use alternative'},
      {regex:/Class.*not found/g,title:'Class Not Found',severity:'critical',fix:'Include class'},
      {regex:/Call to undefined/g,title:'Undefined Call',severity:'critical',fix:'Define function'},
      {regex:/memory size.*exhausted/g,title:'Memory Exhausted',severity:'critical',fix:'Increase limit'},
      {regex:/Maximum execution.*exceeded/g,title:'Max Execution',severity:'high',fix:'Optimize code'},
    ]
  },
  java: {
    patterns: [
      {regex:/NullPointerException/g,title:'Null Pointer',severity:'critical',fix:'Check for null'},
      {regex:/ClassNotFoundException/g,title:'Class Not Found',severity:'critical',fix:'Add JAR'},
      {regex:/NoSuchMethodError/g,title:'No Such Method',severity:'critical',fix:'Update dependency'},
      {regex:/NoClassDefFoundError/g,title:'No Class Def',severity:'critical',fix:'Add classpath'},
      {regex:/IOException/g,title:'IO Exception',severity:'high',fix:'Handle IO'},
      {regex:/SQLException/g,title:'SQL Exception',severity:'high',fix:'Fix SQL'},
      {regex:/ArrayIndexOutOfBounds/g,title:'Array Bounds',severity:'critical',fix:'Check bounds'},
      {regex:/IllegalArgumentException/g,title:'Illegal Argument',severity:'high',fix:'Check argument'},
      {regex:/IllegalStateException/g,title:'Illegal State',severity:'high',fix:'Check state'},
      {regex:/StackOverflowError/g,title:'Stack Overflow',severity:'critical',fix:'Check recursion'},
      {regex:/OutOfMemoryError/g,title:'Out Of Memory',severity:'critical',fix:'Free memory'},
      {regex:/ClassCastException/g,title:'Class Cast',severity:'high',fix:'Check type'},
    ]
  },
  csharp: {
    patterns: [
      {regex:/NullReferenceException/g,title:'Null Reference',severity:'critical',fix:'Check for null'},
      {regex:/ArgumentNullException/g,title:'Argument Null',severity:'high',fix:'Pass non-null'},
      {regex:/ArgumentException/g,title:'Argument Exception',severity:'high',fix:'Check argument'},
      {regex:/InvalidOperationException/g,title:'Invalid Operation',severity:'high',fix:'Check validity'},
      {regex:/NotImplementedException/g,title:'Not Implemented',severity:'high',fix:'Implement method'},
      {regex:/NotSupportedException/g,title:'Not Supported',severity:'high',fix:'Use supported'},
      {regex:/IndexOutOfRangeException/g,title:'Index Out Range',severity:'critical',fix:'Check bounds'},
      {regex:/KeyNotFoundException/g,title:'Key Not Found',severity:'high',fix:'Check key'},
      {regex:/StackOverflowException/g,title:'Stack Overflow',severity:'critical',fix:'Check recursion'},
      {regex:/OutOfMemoryException/g,title:'Out Of Memory',severity:'critical',fix:'Free memory'},
    ]
  },
  cpp: {
    patterns: [
      {regex:/error:/g,title:'C++ Error',severity:'critical',fix:'Fix error'},
      {regex:/warning:/g,title:'Warning',severity:'low',fix:'Fix warning'},
      {regex:/segmentation fault/gi,title:'Segfault',severity:'critical',fix:'Check pointers'},
      {regex:/undefined reference/g,title:'Undefined Reference',severity:'critical',fix:'Link library'},
      {regex:/undeclared/gi,title:'Undeclared',severity:'critical',fix:'Declare or include'},
      {regex:/invalid conversion/g,title:'Invalid Conversion',severity:'high',fix:'Use correct type'},
      {regex:/no matching function/g,title:'No Matching Function',severity:'high',fix:'Check signature'},
      {regex:/pure virtual.*called/gi,title:'Pure Virtual',severity:'critical',fix:'Implement method'},
      {regex:/buffer overflow/gi,title:'Buffer Overflow',severity:'critical',fix:'Check bounds'},
      {regex:/stack overflow/gi,title:'Stack Overflow',severity:'critical',fix:'Check recursion'},
      {regex:/double free/gi,title:'Double Free',severity:'critical',fix:'Check memory'},
    ]
  },
  go: {
    patterns: [
      {regex:/panic:/gi,title:'Go Panic',severity:'critical',fix:'Recover or fix'},
      {regex:/runtime error/gi,title:'Runtime Error',severity:'critical',fix:'Fix runtime'},
      {regex:/index out of range/gi,title:'Index Out Range',severity:'critical',fix:'Check bounds'},
      {regex:/nil pointer/gi,title:'Nil Pointer',severity:'critical',fix:'Check for nil'},
      {regex:/concurrent map/gi,title:'Concurrent Map',severity:'critical',fix:'Use mutex'},
      {regex:/send on closed/gi,title:'Send On Closed',severity:'critical',fix:'Close properly'},
      {regex:/deadlock/gi,title:'Deadlock',severity:'critical',fix:'Check sync'},
      {regex:/connection refused/gi,title:'Connection Refused',severity:'high',fix:'Check server'},
    ]
  },
  rust: {
    patterns: [
      {regex:/panicked/gi,title:'Rust Panic',severity:'critical',fix:'Handle panic'},
      {regex:/thread.*panicked/gi,title:'Thread Panic',severity:'critical',fix:'Handle panic'},
      {regex:/index out of bounds/gi,title:'Index Out Bounds',severity:'critical',fix:'Check bounds'},
      {regex:/division by zero/gi,title:'Division By Zero',severity:'critical',fix:'Check divisor'},
      {regex:/overflowed/gi,title:'Overflow',severity:'critical',fix:'Handle overflow'},
      {regex:/borrow checker/gi,title:'Borrow Error',severity:'high',fix:'Fix lifetime'},
      {regex:/mismatched types/gi,title:'Type Mismatch',severity:'high',fix:'Use correct type'},
      {regex:/error\[E\d+\]/g,title:'Compiler Error',severity:'critical',fix:'Fix error'},
    ]
  },
  ruby: {
    patterns: [
      {regex:/SyntaxError/g,title:'Syntax Error',severity:'critical',fix:'Fix Ruby syntax'},
      {regex:/NameError/g,title:'Name Error',severity:'critical',fix:'Define or require'},
      {regex:/NoMethodError/g,title:'No Method',severity:'critical',fix:'Define method'},
      {regex:/TypeError/g,title:'Type Error',severity:'high',fix:'Use correct type'},
      {regex:/ArgumentError/g,title:'Argument Error',severity:'high',fix:'Check arguments'},
      {regex:/LoadError/g,title:'Load Error',severity:'critical',fix:'Check require'},
      {regex:/ZeroDivisionError/g,title:'Zero Division',severity:'critical',fix:'Check divisor'},
      {regex:/SystemStackError/g,title:'Stack Too Deep',severity:'critical',fix:'Check recursion'},
    ]
  },
  sql: {
    patterns: [
      {regex:/SQL Error/g,title:'SQL Error',severity:'high',fix:'Fix query'},
      {regex:/Syntax error/g,title:'Syntax Error',severity:'critical',fix:'Fix syntax'},
      {regex:/doesn't exist/g,title:'Not Found',severity:'critical',fix:'Create or check'},
      {regex:/Duplicate entry/g,title:'Duplicate',severity:'high',fix:'Use unique'},
      {regex:/Foreign key constraint/g,title:'Foreign Key',severity:'high',fix:'Fix relationship'},
      {regex:/Lock wait timeout/g,title:'Lock Timeout',severity:'medium',fix:'Reduce time'},
      {regex:/Deadlock/g,title:'Deadlock',severity:'medium',fix:'Reorder'},
    ]
  },
  bash: {
    patterns: [
      {regex:/command not found/gi,title:'Command Not Found',severity:'critical',fix:'Install command'},
      {regex:/syntax error/gi,title:'Syntax Error',severity:'critical',fix:'Fix syntax'},
      {regex:/No such file/gi,title:'File Not Found',severity:'high',fix:'Check path'},
      {regex:/Permission denied/gi,title:'Permission Denied',severity:'critical',fix:'Change perms'},
    ]
  },
  json: {
    patterns: [
      {regex:/Unexpected token/gi,title:'Unexpected Token',severity:'critical',fix:'Fix JSON'},
      {regex:/Expected.*in JSON/gi,title:'JSON Error',severity:'critical',fix:'Fix JSON'},
      {regex:/Unquoted string/gi,title:'Unquoted String',severity:'critical',fix:'Quote string'},
      {regex:/Trailing comma/gi,title:'Trailing Comma',severity:'critical',fix:'Remove comma'},
    ]
  },
  yaml: {
    patterns: [
      {regex:/YAML error/gi,title:'YAML Error',severity:'critical',fix:'Fix YAML'},
      {regex:/unexpected token/gi,title:'Unexpected Token',severity:'critical',fix:'Fix syntax'},
      {regex:/did not find expected/gi,title:'Missing Key',severity:'critical',fix:'Add key'},
      {regex:/tab character/gi,title:'Tab Character',severity:'critical',fix:'Use spaces'},
    ]
  },
};

// Framework errors
export const FRAMEWORK_ERRORS = {
  react: [
    {regex:/Element type is invalid/gi,title:'Invalid Element',severity:'critical',fix:'Check import'},
    {regex:/Minified React error/gi,title:'React Error',severity:'critical',fix:'Check code'},
    {regex:/Hydration failed/gi,title:'Hydration Error',severity:'critical',fix:'Match SSR/client'},
    {regex:/hooks can only be called/gi,title:'Hooks Error',severity:'critical',fix:'Use inside component'},
  ],
  vue: [
    {regex:/Vue warn/gi,title:'Vue Warning',severity:'low',fix:'Fix warning'},
    {regex:/Avoid mutating a prop/gi,title:'Prop Mutation',severity:'medium',fix:'Use data()'},
  ],
  angular: [
    {regex:/ExpressionChangedAfterItHasBeenCheckedError/gi,title:'Change Detection',severity:'critical',fix:'Use setTimeout'},
    {regex:/NullInjectorError/gi,title:'Injector Error',severity:'critical',fix:'Provide service'},
  ],
  django: [
    {regex:/No module named/gi,title:'Module Not Found',severity:'critical',fix:'pip install'},
    {regex:/TemplateDoesNotExist/gi,title:'Template Not Found',severity:'high',fix:'Check path'},
    {regex:/CSRF verification failed/gi,title:'CSRF Error',severity:'critical',fix:'Add CSRF token'},
  ],
  laravel: [
    {regex:/Class.*not found/gi,title:'Class Not Found',severity:'critical',fix:'composer dump-autoload'},
    {regex:/SQLSTATE/gi,title:'SQL Error',severity:'critical',fix:'Fix query'},
  ],
  nextjs: [
    {regex:/Error: ENOENT/gi,title:'File Not Found',severity:'critical',fix:'Check file'},
    {regex:/Hydration failed/gi,title:'Hydration Error',severity:'critical',fix:'Match SSR/client'},
  ],
};

// Line/Column extractor
export function extractLineCol(text) {
  const js = text.match(/at .+ \((.+):(\d+):(\d+)\)/);
  if (js) return {line:parseInt(js[2]),col:parseInt(js[3]),file:js[1]};
  const py = text.match(/File "(.+)", line (\d+)/);
  if (py) return {line:parseInt(py[2]),col:0,file:py[1]};
  const l = text.match(/line[:\s]+(\d+)/i);
  if (l) return {line:parseInt(l[1]),col:0,file:''};
  return {line:0,col:0,file:''};
}

// Detect errors from code
export function detectErrors(code, lang) {
  const errors = [];
  const langData = ALL_LANGUAGES[lang?.toLowerCase()];
  if (langData) {
    for (const p of langData.patterns) {
      const matches = code.match(new RegExp(p.regex.source, 'gi'));
      if (matches) {
        for (const m of matches) {
          const loc = extractLineCol(m);
          errors.push({
            language: lang,
            title: p.title,
            description: m,
            severity: p.severity,
            line: loc.line,
            column: loc.col,
            file: loc.file,
            fix: p.fix
          });
        }
      }
    }
  }
  return errors;
}
