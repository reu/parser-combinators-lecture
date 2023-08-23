import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  any,
  char,
  int,
  many0,
  map,
  nat,
  Parser,
  token,
  tuple,
  tuple3,
} from "./combinators.ts";

type Operator = "+" | "-" | "*" | "/" | "**" | "^";

type Expression =
  | { type: "NUMBER"; value: number }
  | {
    type: "BINARY_OPERATION";
    operator: Operator;
    left: Expression;
    right: Expression;
  }
  | { type: "FUNCTION"; name: string; args: Expression[] };

const number: Parser<Expression> = map(
  any([
    map(tuple3(nat, char("."), nat), ([n, _, d]) => n + d * 10 ** -1),
    map(tuple3(int, char("."), nat), ([n, _, d]) => n - d * 10 ** -1),
    int,
  ]),
  (value) => ({ type: "NUMBER", value }),
);

const binaryOperation = (operators: Array<Operator>): Parser<Expression> =>
  map(
    tuple(
      number,
      many0(tuple(any(operators.map(token)), number)),
    ),
    ([left, right]) =>
      right.reduce((left, [operator, right]) => ({
        type: "BINARY_OPERATION",
        left,
        right,
        operator: operator as Operator,
      }), left),
  );

const expression = any([
  binaryOperation(["+", "-"]),
  number,
]);

Deno.test(function testNumber() {
  assertEquals(expression("1"), [{ type: "NUMBER", value: 1 }, ""]);
  assertEquals(expression("-1"), [{ type: "NUMBER", value: -1 }, ""]);
  assertEquals(expression("1.5"), [{ type: "NUMBER", value: 1.5 }, ""]);
  assertEquals(expression("-1.5"), [{ type: "NUMBER", value: -1.5 }, ""]);
});

Deno.test(function testBinaryOperation() {
  assertEquals(expression("1+2"), [{
    type: "BINARY_OPERATION",
    operator: "+",
    left: { type: "NUMBER", value: 1 },
    right: { type: "NUMBER", value: 2 },
  }, ""]);

  assertEquals(expression("1-2"), [{
    type: "BINARY_OPERATION",
    operator: "-",
    left: { type: "NUMBER", value: 1 },
    right: { type: "NUMBER", value: 2 },
  }, ""]);

  assertEquals(expression("1+3-2"), [{
    type: "BINARY_OPERATION",
    operator: "-",
    left: {
      type: "BINARY_OPERATION",
      operator: "+",
      left: { type: "NUMBER", value: 1 },
      right: { type: "NUMBER", value: 3 },
    },
    right: { type: "NUMBER", value: 2 },
  }, ""]);
});
