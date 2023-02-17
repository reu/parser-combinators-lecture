import {
  any,
  char,
  concat,
  delimited,
  int,
  many0,
  map,
  multispace0,
  or,
  Parser,
  satisfy,
  separated0,
  terminated,
  token,
  tuple,
} from "./combinators.ts";

type Json =
  | null
  | boolean
  | number
  | string
  | Array<Json>
  | { [k: string]: Json };

const json: Parser<Json> = (input) =>
  any([
    jsonNull,
    jsonBool,
    jsonNumber,
    string,
    jsonArray,
    jsonObj,
  ])(input);

const quote = char('"');

// Ignore White Space
const ws = <A>(p: Parser<A>): Parser<A> =>
  delimited(multispace0, p, multispace0);

// TODO: add support for escaped strings
const string = delimited(
  quote,
  concat(many0(satisfy((c) => c !== '"'))),
  quote,
);

// TODO: add support for floats
const jsonNumber = int;

const jsonNull = map(token("null"), () => null);

const jsonBool = or(
  map(token("true"), () => true),
  map(token("false"), () => false),
);

const jsonArray = delimited(
  char("["),
  separated0(char(","), ws(json)),
  char("]"),
);

const jsonObjEntry = tuple(
  terminated(ws(string), char(":")),
  ws(json),
);

const jsonObj = delimited(
  char("{"),
  map(
    separated0(char(","), ws(jsonObjEntry)),
    (entries) => entries.reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {}),
  ),
  char("}"),
);

export default json;
