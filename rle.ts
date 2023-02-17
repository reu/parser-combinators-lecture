import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";

import {
  char,
  concat,
  consume,
  doM,
  many0,
  nat,
  Parser,
  success,
} from "./combinators.ts";

export const rleEncode: Parser<string> = concat(many0(doM<any>(function* () {
  const first = yield consume(1);
  const same = yield many0(char(first));
  const length = same.length + 1;
  return success([length, first].join(""));
})));

export const rleDecode: Parser<string> = concat(many0(doM<any>(function* () {
  const length = yield nat;
  const char = yield consume(1);
  return success(new Array(length).fill(char).join(""));
})));

Deno.test(function rleEncodeTest() {
  assertEquals(rleEncode("WWWaaBBBBBc"), ["3W2a5B1c", ""]);
});

Deno.test(function rleDecodeTest() {
  assertEquals(rleDecode("3W2a5B1c"), ["WWWaaBBBBBc", ""]);
  assertEquals(rleDecode("3W2a5B1cABC"), ["WWWaaBBBBBc", "ABC"]);
});
