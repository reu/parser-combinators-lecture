import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  alpha,
  any,
  char,
  concat,
  delimited,
  digit,
  int,
  letter,
  many0,
  many1,
  map,
  nat,
  parse,
  Parser,
  separated0,
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
  | { type: "FUNCTION"; name: string; args: Expression[] }
  | { type: "REFERENCE"; address: string };

const number: Parser<Expression> = map(
  any([
    map(tuple3(nat, char("."), nat), ([n, _, d]) => n + d * 10 ** -1),
    map(tuple3(int, char("."), nat), ([n, _, d]) => n - d * 10 ** -1),
    int,
  ]),
  (value) => ({ type: "NUMBER", value }),
);

const operand: Parser<Expression> = (input) =>
  any([
    delimited(char("("), expression, char(")")),
    number,
  ])(input);

const binaryOperation = (
  operators: Array<Operator>,
  precedent: Parser<Expression>,
): Parser<Expression> =>
  map(
    tuple(
      precedent,
      many0(tuple(any(operators.map(token)), precedent)),
    ),
    ([left, right]) =>
      right.reduce((left, [operator, right]) => ({
        type: "BINARY_OPERATION",
        left,
        right,
        operator: operator as Operator,
      }), left),
  );

const rightAssociativeOperation = (
  operators: Array<Operator>,
  precedent: Parser<Expression>,
): Parser<Expression> =>
  map(
    tuple(
      precedent,
      many0(tuple(any(operators.map(token)), precedent)),
    ),
    ([left, rights]) => {
      if (rights.length > 1) {
        const [first, ...rest] = rights;
        const [operator, firstRight] = first;
        return {
          type: "BINARY_OPERATION",
          operator: operator as Operator,
          left,
          right: rest.reduce((left, [operator, right]) => ({
            type: "BINARY_OPERATION",
            operator: operator as Operator,
            left,
            right,
          }), firstRight),
        };
      } else if (rights.length == 1) {
        const [operator, right] = rights[0];
        return {
          type: "BINARY_OPERATION",
          operator: operator as Operator,
          left,
          right,
        };
      } else {
        return left;
      }
    },
  );

const exponentiation = rightAssociativeOperation(["**", "^"], operand);
const multiplication = binaryOperation(["*", "/"], exponentiation);
const addition = binaryOperation(["+", "-"], multiplication);

const functionCall: Parser<Expression> = (input) => {
  const exp: Parser<Expression> = map(
    tuple(
      concat(many1(alpha)),
      delimited(
        char("("),
        separated0(char(","), expression),
        char(")"),
      ),
    ),
    ([name, args]) => ({ type: "FUNCTION", name, args }),
  );
  return exp(input);
};

const reference: Parser<Expression> = map(
  tuple(concat(many1(letter)), concat(many1(digit))),
  ([letter, digits]) => ({ type: "REFERENCE", address: `${letter}${digits}` }),
);

const expression = any([
  addition,
  functionCall,
  reference,
  number,
]);

const evaluate = parse(
  map(expression, function evaluate(exp: Expression): number {
    switch (exp.type) {
      case "NUMBER":
        return exp.value;
      case "REFERENCE":
      case "FUNCTION":
        return 0;
      case "BINARY_OPERATION": {
        switch (exp.operator) {
          case "+":
            return evaluate(exp.left) + evaluate(exp.right);
          case "-":
            return evaluate(exp.left) - evaluate(exp.right);
          case "*":
            return evaluate(exp.left) * evaluate(exp.right);
          case "/":
            return evaluate(exp.left) / evaluate(exp.right);
          case "**":
          case "^":
            return evaluate(exp.left) ** evaluate(exp.right);
        }
      }
    }
  }),
);

Deno.test(function evaluateTest() {
  assertEquals(evaluate("2*3+4"), 10);
  assertEquals(evaluate("2^2^3"), 256);
});

Deno.test(function testNumber() {
  assertEquals(expression("1"), [{ type: "NUMBER", value: 1 }, ""]);
  assertEquals(expression("-1"), [{ type: "NUMBER", value: -1 }, ""]);
  assertEquals(expression("1.5"), [{ type: "NUMBER", value: 1.5 }, ""]);
  assertEquals(expression("-1.5"), [{ type: "NUMBER", value: -1.5 }, ""]);
});

Deno.test(function testReference() {
  assertEquals(expression("A1"), [{ type: "REFERENCE", address: "A1" }, ""]);
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

  assertEquals(expression("1*2"), [{
    type: "BINARY_OPERATION",
    operator: "*",
    left: { type: "NUMBER", value: 1 },
    right: { type: "NUMBER", value: 2 },
  }, ""]);

  assertEquals(expression("1**2"), [{
    type: "BINARY_OPERATION",
    operator: "**",
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

  assertEquals(expression("1+3*2"), [{
    type: "BINARY_OPERATION",
    operator: "+",
    left: { type: "NUMBER", value: 1 },
    right: {
      type: "BINARY_OPERATION",
      operator: "*",
      left: { type: "NUMBER", value: 3 },
      right: { type: "NUMBER", value: 2 },
    },
  }, ""]);

  assertEquals(expression("1+3**2*4"), [{
    type: "BINARY_OPERATION",
    operator: "+",
    left: { type: "NUMBER", value: 1 },
    right: {
      type: "BINARY_OPERATION",
      operator: "*",
      left: {
        type: "BINARY_OPERATION",
        operator: "**",
        left: { type: "NUMBER", value: 3 },
        right: { type: "NUMBER", value: 2 },
      },
      right: { type: "NUMBER", value: 4 },
    },
  }, ""]);

  assertEquals(expression("(1+3)**(2*4)"), [{
    type: "BINARY_OPERATION",
    operator: "**",
    left: {
      type: "BINARY_OPERATION",
      operator: "+",
      left: { type: "NUMBER", value: 1 },
      right: { type: "NUMBER", value: 3 },
    },
    right: {
      type: "BINARY_OPERATION",
      operator: "*",
      left: { type: "NUMBER", value: 2 },
      right: { type: "NUMBER", value: 4 },
    },
  }, ""]);
});

Deno.test(function testExponentiationRightAssociative() {
  assertEquals(expression("2**3"), [{
    type: "BINARY_OPERATION",
    operator: "**",
    left: { type: "NUMBER", value: 2 },
    right: { type: "NUMBER", value: 3 },
  }, ""]);

  assertEquals(expression("2**3**4"), [{
    type: "BINARY_OPERATION",
    operator: "**",
    left: { type: "NUMBER", value: 2 },
    right: {
      type: "BINARY_OPERATION",
      operator: "**",
      left: { type: "NUMBER", value: 3 },
      right: { type: "NUMBER", value: 4 },
    },
  }, ""]);
});

Deno.test(function testFunction() {
  assertEquals(expression("SUM(1,2)"), [{
    type: "FUNCTION",
    name: "SUM",
    args: [
      { type: "NUMBER", value: 1 },
      { type: "NUMBER", value: 2 },
    ],
  }, ""]);

  assertEquals(expression("NOW()"), [{
    type: "FUNCTION",
    name: "NOW",
    args: [],
  }, ""]);

  assertEquals(expression("SUM(1+2,(2+3)*4)"), [{
    type: "FUNCTION",
    name: "SUM",
    args: [
      {
        type: "BINARY_OPERATION",
        operator: "+",
        left: { type: "NUMBER", value: 1 },
        right: { type: "NUMBER", value: 2 },
      },
      {
        type: "BINARY_OPERATION",
        operator: "*",
        left: {
          type: "BINARY_OPERATION",
          operator: "+",
          left: { type: "NUMBER", value: 2 },
          right: { type: "NUMBER", value: 3 },
        },
        right: { type: "NUMBER", value: 4 },
      },
    ],
  }, ""]);
});
