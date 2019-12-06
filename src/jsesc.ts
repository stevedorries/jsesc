import { whitelist, version } from "./data.ts";
const Buffer = Deno.Buffer;

const object = {};
const hasOwnProperty = object.hasOwnProperty;
const forOwn = (object: any, callback: (key: string, value: any) => void) => {
  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      callback(key, object[key]);
    }
  }
};

const extend = (destination: any, source: any) => {
  if (!source) {
    return destination;
  }
  forOwn(source, (key, value) => {
    destination[key] = value;
  });
  return destination;
};

const forEach = (array: any[], callback: (arg0: any) => void) => {
  const length = array.length;
  let index = -1;
  while (++index < length) {
    callback(array[index]);
  }
};

const toString = object.toString;
const isArray = Array.isArray;

const isObject = (value: unknown): value is object => {
  // This is a very simple check, but it’s good enough for what we need.
  return toString.call(value) == "[object Object]";
};
const isString = (value: unknown): value is string => {
  return typeof value == "string" || toString.call(value) == "[object String]";
};
const isNumber = (value: unknown): value is number => {
  return typeof value == "number" || toString.call(value) == "[object Number]";
};
const isFunction = (value: unknown): value is Function => {
  return typeof value == "function";
};
const isMap = (value: unknown): value is Map<any, any> => {
  return toString.call(value) == "[object Map]";
};
const isSet = (value: unknown): value is Set<any> => {
  return toString.call(value) == "[object Set]";
};
function isNotNullOrUndefined(value: any) {
	return value !== null && value !== undefined;
}
/*--------------------------------------------------------------------------*/

// https://mathiasbynens.be/notes/javascript-escapes#single
const singleEscapes: any = {
  '"': '\\"',
  "'": "\\'",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t"
  // `\v` is omitted intentionally, because in IE < 9, '\v' == 'v'.
  // '\v': '\\x0B'
};
const regexSingleEscape = /["'\\\b\f\n\r\t]/;

const regexDigit = /[0-9]/;
export const regexWhitelist = new RegExp(whitelist);

export interface EscapeOptions {
  escapeEverything?: boolean;
  minimal?: boolean;
  isScriptContext?: boolean;
  quotes?: "single" | "double" | "backtick";
  wrap?: boolean;
  es6?: boolean;
  json?: boolean;
  compact?: boolean;
  lowercaseHex?: boolean;
  numbers?: "binary" | "octal" | "decimal" | "hexadecimal";
  indent?: string;
  indentLevel?: number;
  __inline1__?: boolean;
  __inline2__?: boolean;
}
const defaultOptions: EscapeOptions = {    
  compact: true,  
  numbers: "decimal",
  indent: "\t",
  indentLevel: 0,
  __inline1__: false,
  __inline2__: false
};
export const jsesc = <K, V>(
  argument: Map<K, V> | Set<V> | string | Function | any | any[],
  options: EscapeOptions = defaultOptions
): string => {
  // Handle options

  const opts = { ...defaultOptions, ...options };
  let indent = opts.indent!.repeat(opts.indentLevel!);
  let oldIndent = "";
  const increaseIndentation = () => {
    oldIndent = indent;
    ++opts.indentLevel!;
    indent = opts.indent!.repeat(opts.indentLevel!);
  };
  const json = opts.json;
  let wrap = false;
  let quote = opts.quotes === "single" ? "'" : opts.quotes === "backtick" ? "`" : '"';

  if (json) {    
    wrap = true;
  }
  if(opts.wrap !== undefined) {
	  wrap = opts.wrap;
  }

  const compact = opts.compact === true;
  const lowercaseHex = opts.lowercaseHex === true;

  const inline1 = opts.__inline1__;
  const inline2 = opts.__inline2__;
  const newLine = compact ? "" : "\n";
  let result = "";
  let isEmpty = true;
  const useBinNumbers = opts.numbers == "binary";
  const useOctNumbers = opts.numbers == "octal";
  const useDecNumbers = opts.numbers == "decimal";
  const useHexNumbers = opts.numbers == "hexadecimal";

  if (json && isNotNullOrUndefined(argument) && isFunction(argument.toJSON)) {
    argument = argument.toJSON();
  }

  if (!isString(argument)) {
    if (isMap(argument)) {
      if (argument.size == 0) {
        return "new Map()";
      }
      if (!compact) {
        opts.__inline1__ = true;
        opts.__inline2__ = false;
      }
      return "new Map(" + jsesc(Array.from(argument), opts) + ")";
    }
    if (isSet(argument)) {
      if (argument.size == 0) {
        return "new Set()";
      }
      return "new Set(" + jsesc(Array.from(argument), opts) + ")";
    }
    if (isArray(argument)) {
      let res: any[] = [];
      opts.wrap = true;
      if (inline1) {
        opts.__inline1__ = false;
        opts.__inline2__ = true;
      }
      if (!inline2) {
        increaseIndentation();
      }
      forEach(argument, value => {
        isEmpty = false;
        if (inline2) {
          opts.__inline2__ = false;
        }
        res.push((compact || inline2 ? "" : indent) + jsesc(value, opts));
      });
      if (isEmpty) {
        return "[]";
      }
      if (inline2) {
        return "[" + res.join(", ") + "]";
      }
      return (
        "[" +
        newLine +
        res.join("," + newLine) +
        newLine +
        (compact ? "" : oldIndent) +
        "]"
      );
    }
    if (isNumber(argument)) {
      if (json) {
        // Some number values (e.g. `Infinity`) cannot be represented in JSON.
        return JSON.stringify(argument);
      }
      if (useDecNumbers) {
        return String(argument);
      }
      if (useHexNumbers) {
        let hexadecimal = argument.toString(16);
        if (!lowercaseHex) {
          hexadecimal = hexadecimal.toUpperCase();
        }
        return "0x" + hexadecimal;
      }
      if (useBinNumbers) {
        return "0b" + argument.toString(2);
      }
      if (useOctNumbers) {
        return "0o" + argument.toString(8);
      }
	}
	if (!isObject(argument)) {
      if (json) {
        // For some values (e.g. `undefined`, `function` objects),
        // `JSON.stringify(value)` returns `undefined` (which isn’t valid
        // JSON) instead of `'null'`.
        return JSON.stringify(argument) || "null";
      }
      return String(argument);
    } else {
      // it’s an object
      let res: any[] = [];
      opts.wrap = true;
      increaseIndentation();
      forOwn(argument, (key, value) => {
        isEmpty = false;
        res.push(
          (compact ? "" : indent) +
            jsesc(key, opts) +
            ":" +
            (compact ? "" : " ") +
            jsesc(value, opts)
        );
      });
      if (isEmpty) {
        return "{}";
      }
      return (
        "{" +
        newLine +
        res.join("," + newLine) +
        newLine +
        (compact ? "" : oldIndent) +
        "}"
      );
    }
  } else {
    const string = argument.toString();
    // Loop over each code unit in the string and escape it
    let index = -1;
    const length = string.length;
    result = "";
    while (++index < length) {
      const character = string.charAt(index);
      if (opts.es6) {
        const first = string.charCodeAt(index);
        if (
          // check if it’s the start of a surrogate pair
          first >= 0xd800 &&
          first <= 0xdbff && // high surrogate
          length > index + 1 // there is a next code unit
        ) {
          const second = string.charCodeAt(index + 1);
          if (second >= 0xdc00 && second <= 0xdfff) {
            // low surrogate
            // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
            const codePoint =
              (first - 0xd800) * 0x400 + second - 0xdc00 + 0x10000;
            let hexadecimal = codePoint.toString(16);
            if (!lowercaseHex) {
              hexadecimal = hexadecimal.toUpperCase();
            }
            result += "\\u{" + hexadecimal + "}";
            ++index;
            continue;
          }
        }
      }
      if (!opts.escapeEverything) {
        if (regexWhitelist.test(character)) {
          // It’s a printable ASCII character that is not `"`, `'` or `\`,
          // so don’t escape it.
          result += character;
          continue;
        }
        if (character == '"') {
          result += quote == character ? '\\"' : character;
          continue;
        }
        if (character == "`") {
          result += quote == character ? "\\`" : character;
          continue;
        }
        if (character == "'") {
          result += quote == character ? "\\'" : character;
          continue;
        }
      }
      if (
        character == "\0" &&
        !json &&
        !regexDigit.test(string.charAt(index + 1))
      ) {
        result += "\\0";
        continue;
      }
      if (regexSingleEscape.test(character)) {
        // no need for a `hasOwnProperty` check here
        result += singleEscapes[character];
        continue;
      }
      const charCode = character.charCodeAt(0);
      if (opts.minimal && charCode != 0x2028 && charCode != 0x2029) {
        result += character;
        continue;
      }
      let hexadecimal = charCode.toString(16);
      if (!lowercaseHex) {
        hexadecimal = hexadecimal.toUpperCase();
      }
      const longhand = hexadecimal.length > 2 || json;
      const escaped =
        "\\" +
        (longhand ? "u" : "x") +
        ("0000" + hexadecimal).slice(longhand ? -4 : -2);
      result += escaped;
      continue;
    }
    if (wrap === true) {
      result = quote + result + quote;
    }
    if (quote == "`") {
      result = result.replace(/\$\{/g, "\\${");
    }
    if (opts.isScriptContext) {
      // https://mathiasbynens.be/notes/etago
      return result
        .replace(/<\/(script|style)/gi, "<\\/$1")
        .replace(/<!--/g, json ? "\\u003C!--" : "\\x3C!--");
    }
  }
  return result;
};

jsesc.version = version;