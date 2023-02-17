import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";

import json from "./json.ts";

Deno.test(function jsonTest() {
  assertEquals(json("null"), [null, ""]);
  assertEquals(json("true"), [true, ""]);
  assertEquals(json("false"), [false, ""]);
  assertEquals(json('"hi"'), ["hi", ""]);
  assertEquals(json("10"), [10, ""]);
  assertEquals(json("-10"), [-10, ""]);
  assertEquals(json("[]"), [[], ""]);
  assertEquals(json("[1]"), [[1], ""]);
  assertEquals(json("{}"), [{}, ""]);
  assertEquals(json('{"key": 1}'), [{ key: 1 }, ""]);
  assertEquals(json('{"key": "val"}'), [{ key: "val" }, ""]);
  assertEquals(json('{"key": [1, "val"]}'), [{ key: [1, "val"] }, ""]);
  assertEquals(json('{"key":[1 , "val"],"b":{"c" : null}}'), [{
    key: [1, "val"],
    b: { c: null },
  }, ""]);
});
