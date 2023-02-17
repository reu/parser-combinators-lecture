import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";

import {
  all,
  any,
  char,
  consume,
  delimited,
  digit,
  failure,
  int,
  isParseError,
  many0,
  many1,
  map,
  nat,
  or,
  preceeded,
  satisfy,
  separated0,
  separated1,
  sequence,
  success,
  terminated,
  token,
  tuple,
} from "./combinators.ts";

Deno.test(function successTest() {
  assertEquals(success("lol")(""), ["lol", ""]);
  assertEquals(success("lol")("wut"), ["lol", "wut"]);
});

Deno.test(function failureTest() {
  assert(isParseError(failure("nope")("wut")));
});

Deno.test(function mapTest() {
  const parser = map(char("a"), (a) => a.toUpperCase());
  assertEquals(parser("a"), ["A", ""]);
  assertEquals(parser("abc"), ["A", "bc"]);
  assert(isParseError(parser("bc")));
});

Deno.test(function sequenceTest() {
  const parser = sequence(char("a"), (a) => char(a.toUpperCase()));
  assertEquals(parser("aA"), ["A", ""]);
  assertEquals(parser("aAbc"), ["A", "bc"]);
  assert(isParseError(parser("abc")));
});

Deno.test(function orTest() {
  const parser = or(char("a"), char("b"));
  assertEquals(parser("a"), ["a", ""]);
  assertEquals(parser("abc"), ["a", "bc"]);
  assertEquals(parser("bac"), ["b", "ac"]);
  assert(isParseError(parser("c")));
});

Deno.test(function pairTest() {
  const parser = tuple(char("a"), char("b"));
  assertEquals(parser("ab"), [["a", "b"], ""]);
  assertEquals(parser("abc"), [["a", "b"], "c"]);
  assert(isParseError(parser("ac")));
});

Deno.test(function anyTest() {
  const parser = any([char("a"), char("b"), char("c")]);
  assertEquals(parser("a"), ["a", ""]);
  assertEquals(parser("b"), ["b", ""]);
  assertEquals(parser("c"), ["c", ""]);
  assertEquals(parser("ab"), ["a", "b"]);
  assertEquals(parser("bb"), ["b", "b"]);
  assertEquals(parser("cb"), ["c", "b"]);
  assert(isParseError(parser("d")));
});

Deno.test(function allTest() {
  const parser = all([char("a"), char("b"), char("c")]);
  assertEquals(parser("abc"), [["a", "b", "c"], ""]);
  assertEquals(parser("abcd"), [["a", "b", "c"], "d"]);
  assert(isParseError(parser("ab")));
  assert(isParseError(parser("abb")));
});

Deno.test(function many0Test() {
  const parser = many0(char("a"));
  assertEquals(parser("aaa"), [["a", "a", "a"], ""]);
  assertEquals(parser("aaabc"), [["a", "a", "a"], "bc"]);
  assertEquals(parser("bc"), [[], "bc"]);
});

Deno.test(function many1Test() {
  const parser = many1(char("a"));
  assertEquals(parser("aaa"), [["a", "a", "a"], ""]);
  assertEquals(parser("aaabc"), [["a", "a", "a"], "bc"]);
  assert(isParseError(parser("bc")));
});

Deno.test(function preceededTest() {
  const parser = preceeded(char("a"), char("b"));
  assertEquals(parser("ab"), ["b", ""]);
  assertEquals(parser("abc"), ["b", "c"]);
  assert(isParseError(parser("bc")));
});

Deno.test(function terminatedTest() {
  const parser = terminated(char("a"), char("b"));
  assertEquals(parser("ab"), ["a", ""]);
  assertEquals(parser("abc"), ["a", "c"]);
  assert(isParseError(parser("bc")));
});

Deno.test(function delimitedTest() {
  const parser = delimited(char("'"), char("a"), char("'"));
  assertEquals(parser("'a'"), ["a", ""]);
  assertEquals(parser("'a'bc"), ["a", "bc"]);
  assert(isParseError(parser("'abc")));
  assert(isParseError(parser("a'bc")));
  assert(isParseError(parser("abc")));
});

Deno.test(function separated0Test() {
  const parser = separated0(char(","), char("a"));
  assertEquals(parser("a,a,a"), [["a", "a", "a"], ""]);
  assertEquals(parser("a"), [["a"], ""]);
  assertEquals(parser(""), [[], ""]);
  assertEquals(parser("abc"), [["a"], "bc"]);
  assertEquals(parser("a,a,abc"), [["a", "a", "a"], "bc"]);
  assertEquals(parser("bc"), [[], "bc"]);
});

Deno.test(function separated1Test() {
  const parser = separated1(char(","), char("a"));
  assertEquals(parser("a,a,a"), [["a", "a", "a"], ""]);
  assertEquals(parser("a"), [["a"], ""]);
  assertEquals(parser("abc"), [["a"], "bc"]);
  assertEquals(parser("a,a,abc"), [["a", "a", "a"], "bc"]);
  assert(isParseError(parser("")));
  assert(isParseError(parser("bc")));
});

Deno.test(function consumeTest() {
  const parser = consume(3);
  assertEquals(parser("abc"), ["abc", ""]);
  assertEquals(parser("abcd"), ["abc", "d"]);
  assert(isParseError(parser("ab")));
});

Deno.test(function charSatisfyTest() {
  const parser = satisfy((c) => c === "a");
  assertEquals(parser("a"), ["a", ""]);
  assertEquals(parser("abc"), ["a", "bc"]);
  assert(isParseError(parser("bc")));
});

Deno.test(function charTest() {
  const parser = char("a");
  assertEquals(parser("a"), ["a", ""]);
  assertEquals(parser("abc"), ["a", "bc"]);
  assert(isParseError(parser("bc")));
});

Deno.test(function tokenTest() {
  const parser = token("hello");
  assertEquals(parser("hello"), ["hello", ""]);
  assertEquals(parser("hello world"), ["hello", " world"]);
  assert(isParseError(parser("hi world")));
});

Deno.test(function digitTest() {
  assertEquals(digit("1"), ["1", ""]);
  assertEquals(digit("234"), ["2", "34"]);
  assert(isParseError(digit("")));
  assert(isParseError(digit("a")));
});

Deno.test(function natTest() {
  assertEquals(nat("1"), [1, ""]);
  assertEquals(nat("1500"), [1500, ""]);
  assertEquals(nat("1abc"), [1, "abc"]);
  assertEquals(nat("1500abc"), [1500, "abc"]);
  assert(isParseError(nat("")));
  assert(isParseError(nat("abc")));
});

Deno.test(function intTest() {
  assertEquals(int("1"), [1, ""]);
  assertEquals(int("-1"), [-1, ""]);
  assertEquals(int("+1"), [1, ""]);
  assertEquals(int("1500"), [1500, ""]);
  assertEquals(int("-1500"), [-1500, ""]);
  assertEquals(int("1abc"), [1, "abc"]);
  assertEquals(int("1500abc"), [1500, "abc"]);
  assert(isParseError(int("")));
  assert(isParseError(int("abc")));
});
