import { test, runTests } from "https://deno.land/std/testing/mod.ts";
import { assert, assertNotEquals, assertEquals, assertThrows, fail } from "https://deno.land/std/testing/asserts.ts";
import {jsesc} from "../mod.ts"
// Some of these depend on `JSON.parse()`, so only test them in Node
const testArray = [
	undefined, Infinity, new Number(Infinity), -Infinity,
	new Number(-Infinity), 0, new Number(0), -0, new Number(-0), +0,
	new Number(+0), new Function(), 'str',
	function zomg() { return 'desu'; }, null, true, new Boolean(true),
	false, new Boolean(false), {
		"foo": 42, "hah": [ 1, 2, 3, { "foo" : 42 } ]
	}
];

test({
	name: "Base formatting",
	fn: function numericBase():void {
		assertEquals(
			jsesc([0x42, 0x1337], {
				'numbers': 'decimal'
			}),
			'[66,4919]',
			'`numbers: \'decimal\'` (default)'
		);
		assertEquals(
			jsesc([0x42, 0x1337], {
				'numbers': 'binary'
			}),
			'[0b1000010,0b1001100110111]',
			'`numbers: \'binary\'`'
		);
	}
});

test({
	name:"JSON Formatting",
	fn: function jsonTests():void {
		
		
		assertEquals(
			jsesc([0x42, 0x1337, NaN, Infinity], {
				'numbers': 'binary',
				'json': true
			}),
			'[66,4919,null,null]',
			'`json: true` takes precedence over `numbers: \'binary\'`'
		);
		let expected = '"\\"\\u003C!--<script><\\/script>\\";alert(1);"';
let actual = jsesc(`"<!--<script></script>";alert(1);`, {
	'isScriptContext': true,
	'json': true
});
		assertEquals(
			actual,
			expected,
			'isScriptContext'
		);
		// JSON
		assertEquals(
			jsesc('foo\x00bar\xFF\uFFFDbaz', {
				'json': true
			}),
			'"foo\\u0000bar\\u00FF\\uFFFDbaz"',
			'JSON-stringifying a string'
		);
		assertEquals(
			jsesc('foo\x00bar\uFFFDbaz', {
				'escapeEverything': true,
				'json': true
			}),
			'"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A"',
			'JSON-stringifying a string with `escapeEverything: true`'
		);
		assertEquals(
			jsesc({ 'foo\x00bar\uFFFDbaz': 'foo\x00bar\uFFFDbaz' }, {
				'escapeEverything': true,
				'json': true
			}),
			'{"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A":"\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A"}',
			'JSON-stringifying a flat object with `escapeEverything: true`'
		);
		assertEquals(
			jsesc(['foo\x00bar\uFFFDbaz', 'foo\x00bar\uFFFDbaz'], {
				'escapeEverything': true,
				'json': true
			}),
			'["\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A","\\u0066\\u006F\\u006F\\u0000\\u0062\\u0061\\u0072\\uFFFD\\u0062\\u0061\\u007A"]',
			'JSON-stringifying a flat array with `escapeEverything: true`'
		);
		assertEquals(
			jsesc('foo "\x00" bar', {
				'json': true,
				'wrap': false // override default `wrap: true` when `json` is enabled
			}),
			'foo \\"\\u0000\\" bar',
			'Escaping as JSON with `wrap: false` escapes double quotes correctly'
		);
		assertEquals(
			jsesc('foo\x00bar', {
				'json': true,
				'wrap': false // override default `wrap: true` when `json` is enabled
			}),
			"foo\\u0000bar",
			'Escaping as JSON with `wrap: false`'
		);
		
		assertEquals(
			jsesc('foo "\x00" bar \' qux', {
				'json': true,
				'quotes': 'single', // override default `quotes: 'double'` when `json` is enabled
				'wrap': false // override default `wrap: true` when `json` is enabled
			}),
			'foo "\\u0000" bar \\\' qux',
			'Escaping as JSON with `wrap: false, quotes: \'single\'`'
		);
		assertEquals(
			jsesc('foo\uD834\uDF06bar\xA9baz', {
				'json': true,
				'es6': true // override default `es6: false` when `json` is enabled
			}),
			'"foo\\u{1D306}bar\\u00A9baz"',
			'Escaping as JSON with `es6: true`'
		);
	}
  });

test({
	name:"Common Usage",
	fn: function commonOperations():void {
		let actual = "";
		let expected = "";

		assertEquals(
			typeof jsesc.version,
			'string',
			'`jsesc.version` must be a string'
		);
		assertEquals(
			jsesc('\0\x31'),
			'\\x001',
			'`\\0` followed by `1`'
		);
		assertEquals(
			jsesc('\0\x38'),
			'\\x008',
			'`\\0` followed by `8`'
		);
		assertEquals(
			jsesc('\0\x39'),
			'\\x009',
			'`\\0` followed by `9`'
		);
		assertEquals(
			jsesc('\0a'),
			'\\0a',
			'`\\0` followed by `a`'
		);	
		assertEquals(
			jsesc('foo${1+1} `bar`', {
				'quotes': 'backtick'
			}),
			'foo\\${1+1} \\`bar\\`',
			'`quotes: \'backtick\'`'
		);
		assertEquals(
			jsesc('foo${1+1} `bar`', {
				'quotes': 'backtick',
				'wrap': true
			}),
			'`foo\\${1+1} \\`bar\\``',
			'`quotes: \'backtick\'` + `wrap: true`'
		);
		assertEquals(
			jsesc('foo${1+1}</script>', {
				'quotes': 'backtick',
				'wrap': true,
				'isScriptContext': true
			}),
			'`foo\\${1+1}<\\/script>`',
			'`quotes: \'backtick\'` + `wrap: true` + `isScriptContext: true`'
		);
		assertEquals(
			jsesc('\\x00'),
			'\\\\x00',
			'`\\\\x00` shouldn’t be changed to `\\\\0`'
		);
		assertEquals(
			jsesc('a\\x00'),
			'a\\\\x00',
			'`a\\\\x00` shouldn’t be changed to `\\\\0`'
		);
		assertEquals(
			jsesc('\\\x00'),
			'\\\\\\0',
			'`\\\\\\x00` should be changed to `\\\\\\0`'
		);
		assertEquals(
			jsesc('\\\\x00'),
			'\\\\\\\\x00',
			'`\\\\\\\\x00` shouldn’t be changed to `\\\\\\\\0`'
		);
		assertEquals(
			jsesc('lolwat"foo\'bar', {
				'escapeEverything': true
			}),
			'\\x6C\\x6F\\x6C\\x77\\x61\\x74\\"\\x66\\x6F\\x6F\\\'\\x62\\x61\\x72',
			'escapeEverything'
		);
		actual = jsesc('\0foo\u2029bar\nbaz\xA9qux\uD834\uDF06flops', {
			'minimal': true
		});
		expected = '\\0foo\\u2029bar\\nbaz\xA9qux\uD834\uDF06flops';
		assertEquals(actual,expected,'minimal');
		assertEquals(
			jsesc('foo</script>bar</style>baz</script>qux', {
				'isScriptContext': true
			}),
			'foo<\\/script>bar<\\/style>baz<\\/script>qux',
			'isScriptContext'
		);
		assertEquals(
			jsesc('foo</sCrIpT>bar</STYLE>baz</SCRIPT>qux', {
				'isScriptContext': true
			}),
			'foo<\\/sCrIpT>bar<\\/STYLE>baz<\\/SCRIPT>qux',
			'isScriptContext'
		);
		assertEquals(
			jsesc('"<!--<script></script>";alert(1);', {
				'isScriptContext': true
			}),
			'\\"\\x3C!--<script><\\/script>\\";alert(1);',
			'isScriptContext'
		);
		
		assertEquals(
			jsesc([0x42, 0x1337], {
				'numbers': 'octal'
			}),
			'[0o102,0o11467]',
			'`numbers: \'octal\'`'
		);
		assertEquals(
			jsesc([0x42, 0x1337], {
				'numbers': 'hexadecimal'
			}),
			'[0x42,0x1337]',
			'`numbers: \'hexadecimal\'`'
		);
		assertEquals(
			jsesc('a\uD834\uDF06b', {
				'es6': true
			}),
			'a\\u{1D306}b',
			'es6'
		);
		assertEquals(
			jsesc('a\uD834\uDF06b\uD83D\uDCA9c', {
				'es6': true
			}),
			'a\\u{1D306}b\\u{1F4A9}c',
			'es6'
		);
		assertEquals(
			jsesc('a\uD834\uDF06b\uD83D\uDCA9c', {
				'es6': true,
				'escapeEverything': true
			}),
			'\\x61\\u{1D306}\\x62\\u{1F4A9}\\x63',
			'es6 + escapeEverything'
		);
		assertEquals(
			jsesc({}, {
				'compact': true
			}),
			'{}',
			'Stringifying an empty object with `compact: true`'
		);
		assertEquals(
			jsesc({}, {
				'compact': false
			}),
			'{}',
			'Stringifying an empty object with `compact: false`'
		);
		assertEquals(
			jsesc([], {
				'compact': true
			}),
			'[]',
			'Stringifying an empty array with `compact: true`'
		);
		assertEquals(
			jsesc([], {
				'compact': false
			}),
			'[]',
			'Stringifying an empty array with `compact: false`'
		);
		// Stringifying flat objects containing only string values
		assertEquals(
			jsesc({ 'foo\x00bar\uFFFDbaz': 'foo\x00bar\uFFFDbaz' }),
			'{"foo\\0bar\\uFFFDbaz":"foo\\0bar\\uFFFDbaz"}',
			'Stringifying a flat object with default settings`'
		);
		assertEquals(
			jsesc({ 'foo\x00bar\uFFFDbaz': 'foo\x00bar\uFFFDbaz' }, {
				'quotes': 'double'
			}),
			'{"foo\\0bar\\uFFFDbaz":"foo\\0bar\\uFFFDbaz"}',
			'Stringifying a flat object with `quotes: \'double\'`'
		);
		assertEquals(
			jsesc({ 'foo\x00bar\uFFFDbaz': 'foo\x00bar\uFFFDbaz' }, {
				'compact': false
			}),
			'{\n\t"foo\\0bar\\uFFFDbaz": "foo\\0bar\\uFFFDbaz"\n}',
			'Stringifying a flat object with `compact: false`'
		);
		assertEquals(
			jsesc(['a', 'b', 'c'], {
				'compact': false,
				'indentLevel': 1
			}),
			'[\n\t\t"a",\n\t\t"b",\n\t\t"c"\n\t]',
			'`indentLevel: 1`'
		);
		assertEquals(
			jsesc(['a', 'b', 'c'], {
				'compact': false,
				'indentLevel': 2
			}),
			'[\n\t\t\t"a",\n\t\t\t"b",\n\t\t\t"c"\n\t\t]',
			'`indentLevel: 2`'
		);
		assertEquals(
			jsesc({ 'foo\x00bar\uFFFDbaz': 'foo\x00bar\uFFFDbaz' }, {
				'compact': false,
				'indent': '  '
			}),
			'{\n  "foo\\0bar\\uFFFDbaz": "foo\\0bar\\uFFFDbaz"\n}',
			'Stringifying a flat object with `compact: false, indent: \'  \'`'
		);
		assertEquals(
			jsesc({ 'foo\x00bar\uFFFDbaz': 'foo\x00bar\uFFFDbaz' }, {
				'escapeEverything': true
			}),
			'{"\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A":"\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A"}',
			'Stringifying a flat object with `escapeEverything: true`'
		);
		// Stringifying flat arrays containing only string values
		assertEquals(
			jsesc(['foo\x00bar\uFFFDbaz', '\xA9'], {
				'escapeEverything': true
			}),
			'["\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A","\\xA9"]',
			'Stringifying a flat array with `escapeEverything: true`'
		);
		assertEquals(
			jsesc(['foo\x00bar\uFFFDbaz', '\xA9'], {
				'compact': false
			}),
			'[\n\t"foo\\0bar\\uFFFDbaz",\n\t"\\xA9"\n]',
			'Stringifying a flat array with `compact: false`'
		);
		assertEquals(
			jsesc(
				new Map([])
			),
			'new Map()',
			'Stringifying an empty Map'
		);
		assertEquals(
			jsesc(
				new Map([
					['a', 1],
					['b', 2]
				]),
				{
					'compact': true
				}
			),
			'new Map([["a",1],["b",2]])',
			'Stringifying a Map with `compact: true`'
		);
		assertEquals(
			jsesc(
				new Map([
					['a', 1],
					['b', 2]
				]),
				{
					'compact': false
				}
			),
			'new Map([\n\t["a", 1],\n\t["b", 2]\n])',
			'Stringifying a Map with `compact: false`'
		);
		assertEquals(
			jsesc(
				new Map<string,any>([
					['a', 1],
					['b', [
						'a',
						'nested',
						'array'
					]]
				]),
				{
					'compact': false
				}
			),
			'new Map([\n\t["a", 1],\n\t["b", [\n\t\t"a",\n\t\t"nested",\n\t\t"array"\n\t]]\n])',
			'Stringifying a Map with `compact: false`'
		);
		assertEquals(
			jsesc(
				new Map<string,any>([
					['a', 1],
					['b', new Map([
						['x', 2],
						['y', 3]
					])]
				]),
				{
					'compact': false
				}
			),
			'new Map([\n\t["a", 1],\n\t["b", new Map([\n\t\t["x", 2],\n\t\t["y", 3]\n\t])]\n])',
			'Stringifying a Map with `compact: false`'
		);
		assertEquals(
			jsesc(
				new Set([])
			),
			'new Set()',
			'Stringifying an empty Set'
		);
		assertEquals(
			jsesc(
				new Set([
					['a'],
					'b',
					{}
				]),
				{
					'compact': true
				}
			),
			'new Set([["a"],"b",{}])',
			'Stringifying a Set with `compact: true`'
		);
		assertEquals(
			jsesc(
				new Set([
					['a'],
					'b',
					{}
				]),
				{
					'compact': false
				}
			),
			'new Set([\n\t[\n\t\t"a"\n\t],\n\t"b",\n\t{}\n])',
			'Stringifying a Set with `compact: false`'
		);
		
		
		const tmp = {
			'shouldn\u2019t be here': 10,
			'toJSON': function() {
				return {
					'hello': 'world',
					'\uD83D\uDCA9': 'foo',
					'pile': '\uD83D\uDCA9'
				};
			}
		};
		assertEquals(
			jsesc(tmp, { 'json' : true }),
			'{"hello":"world","\\uD83D\\uDCA9":"foo","pile":"\\uD83D\\uDCA9"}',
			'`toJSON` methods are called when `json: true`'
		);
		assertNotEquals(
			jsesc(tmp),
			'{"hello":"world","\\uD83D\\uDCA9":"foo","pile":"\\uD83D\\uDCA9"}',
			'`toJSON` methods are not called when `json: false`'
		);
		assertEquals(
			jsesc(42, {
				'numbers': 'hexadecimal',
				'lowercaseHex': true
			}),
			'0x2a',
			'Hexadecimal integeral literals are lowercase when `lowercaseHex: true`'
		);
		assertEquals(
			jsesc('\u2192\xE9', {
				'lowercaseHex': true
			}),
			'\\u2192\\xe9',
			'Alphabetical hexadecimal digits are lowercase when `lowercaseHex: true`'
		);
		assertEquals(
			jsesc('\u2192\xE9', {
				'lowercaseHex': false
			}),
			'\\u2192\\xE9',
			'Alphabetical hexadecimal digits are uppercase when `lowercaseHex: false`'
		);
		assertEquals(
			jsesc('\u2192\xE9', {
				'lowercaseHex': true,
				'json': true
			}),
			'"\\u2192\\u00e9"',
			'Alphabetical hexadecimal digits are lowercase when `lowercaseHex: false` and `json: true`'
		);
		assertEquals(
			jsesc('\u2192\xe9', {
				'lowercaseHex': false,
				'json': true
			}),
			'"\\u2192\\u00E9"',
			'Alphabetical hexadecimal digits are uppercase when `lowercaseHex: false` and `json: true`'
		);
		assertEquals(
			jsesc('\xE7\xE7a\xE7\xE7', {
				'lowercaseHex': true,
				'escapeEverything': true
			}),
			'\\xe7\\xe7\\x61\\xe7\\xe7',
			'Alphabetical hexadecimal digits are lowercase when `lowercaseHex: true` and `escapeEverything: true`'
		);
		assertEquals(
			jsesc('\xE7\xE7a\xE7\xE7', {
				'lowercaseHex': false,
				'escapeEverything': true
			}),
			'\\xE7\\xE7\\x61\\xE7\\xE7',
			'Alphabetical hexadecimal digits are uppercase when `lowercaseHex: false` and `escapeEverything: true`'
		);
		assertEquals(
			jsesc('\u2192\xE9\uD83D\uDCA9', {
				'lowercaseHex': true,
				'es6': true
			}),
			'\\u2192\\xe9\\u{1f4a9}',
			'Alphabetical hexadecimal digits are lowercase when `lowercaseHex: true` and `es6: true`'
		);
		assertEquals(
			jsesc('\u2192\xE9\uD83D\uDCA9', {
				'lowercaseHex': false,
				'es6': true
			}),
			'\\u2192\\xE9\\u{1F4A9}',
			'Alphabetical hexadecimal digits are uppercase when `lowercaseHex: false` and `es6: true`'
		);	
  }
});


test({name:'advanced tests', fn: function advancedOperations() {
	let allSymbols = '';
	// Generate strings based on code points. Trickier than it seems:
	// https://mathiasbynens.be/notes/javascript-encoding
	for (let codePoint = 0x000000; codePoint <= 0x10FFFF; codePoint += 0xF) {
		const symbol = String.fromCodePoint(codePoint);
		// ok(
		// 	eval('\'' + jsesc(symbol) + '\'') == symbol,
		// 	'U+' + codePoint.toString(16).toUpperCase()
		// );
		allSymbols += symbol + ' ';
	}	
		assert(
			eval('\'' + jsesc(allSymbols) + '\'') == allSymbols,
			'All Unicode symbols, space-separated, default quote type (single quotes)'
		);
		assert(
			eval('\'' + jsesc(allSymbols, {
				'quotes': 'single'
			}) + '\'') == allSymbols,
			'All Unicode symbols, space-separated, single quotes'
		);
		assert(
			eval('`' + jsesc(allSymbols, {
				'quotes': 'backtick'
			}) + '`') == allSymbols,
			'All Unicode symbols, space-separated, template literal'
		);
		assert(
			eval(jsesc(allSymbols, {
				'quotes': 'single',
				'wrap': true
			})) == allSymbols,
			'All Unicode symbols, space-separated, single quotes, auto-wrap'
		);
		assert(
			eval('"' + jsesc(allSymbols, {
				'quotes': 'double'
			}) + '"') == allSymbols,
			'All Unicode symbols, space-separated, double quotes'
		);
		assert(
			eval(jsesc(allSymbols, {
				'quotes': 'double',
				'wrap': true
			})) == allSymbols,
			'All Unicode symbols, space-separated, double quotes, auto-wrap'
		);
		
		assertEquals(
			jsesc(testArray, {
				'json': false
			}),
			'[undefined,Infinity,Infinity,-Infinity,-Infinity,0,0,0,0,0,0,function anonymous(\n) {\n\n},"str",function zomg() { return \'desu\'; },null,true,true,false,false,{"foo":42,"hah":[1,2,3,{"foo":42}]}]',
			'Escaping a non-flat array with all kinds of values'
		);
		assertEquals(
			jsesc(testArray, {
				'json': true
			}),
			'[null,null,null,null,null,0,0,0,0,0,0,null,"str",null,null,true,true,false,false,{"foo":42,"hah":[1,2,3,{"foo":42}]}]',
			'Escaping a non-flat array with all kinds of values, with `json: true`'
		);
		assertEquals(
			jsesc(testArray, {
				'json': true,
				'compact': false
			}),
			'[\n\tnull,\n\tnull,\n\tnull,\n\tnull,\n\tnull,\n\t0,\n\t0,\n\t0,\n\t0,\n\t0,\n\t0,\n\tnull,\n\t"str",\n\tnull,\n\tnull,\n\ttrue,\n\ttrue,\n\tfalse,\n\tfalse,\n\t{\n\t\t"foo": 42,\n\t\t"hah": [\n\t\t\t1,\n\t\t\t2,\n\t\t\t3,\n\t\t\t{\n\t\t\t\t"foo": 42\n\t\t\t}\n\t\t]\n\t}\n]',
			'Escaping a non-flat array with all kinds of values, with `json: true, compact: false`'
		);
	}
});
