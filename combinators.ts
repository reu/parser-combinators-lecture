const errorSymbol = Symbol("error");
const error = (msg: string) => ({ [errorSymbol]: msg });

export type ParseError = { [errorSymbol]: string };

export type Parser<A> = (input: string) => [A | ParseError, string];

export const isError = <A>(res: A | ParseError): res is ParseError =>
  res !== null && typeof res === "object" && errorSymbol in res;

export const isParseError = <A>([res, _]: ReturnType<Parser<A>>) =>
  isError(res);

export const parse = <A>(p: Parser<A>) => (input: string): A => {
  const [res, _rest] = p(input);
  if (isError(res)) {
    throw new Error(res[errorSymbol]);
  } else {
    return res;
  }
};

export const success = <A>(val: A): Parser<A> => (input) => [val, input];

export const failure =
  <A>(msg: string): Parser<A> => (input) => [error(msg), input];

export const map =
  <A, B>(p: Parser<A>, fn: (res: A) => B): Parser<B> => (input) => {
    const [res, rest] = p(input);
    return isError(res) ? [res, input] : [fn(res), rest];
  };

export const sequence =
  <A, B>(p: Parser<A>, fn: (res: A) => Parser<B>): Parser<B> => (input) => {
    const [res, rest] = p(input);
    return isError(res) ? [res, input] : fn(res)(rest);
  };

export const doM =
  <A>(genFn: () => Generator<Parser<A>, Parser<A>, A>): Parser<A> =>
  (
    input,
  ) => {
    const gen = genFn();
    const advance = (prev: A): Parser<A> => {
      const { done, value } = gen.next(prev);
      return done ? value : sequence(value, advance);
    };
    return advance(null as A)(input);
  };

export const or =
  <A, B>(p1: Parser<A>, p2: Parser<B>): Parser<A | B> => (input) => {
    const res = p1(input);
    return isParseError(res) ? p2(input) : res;
  };

export const tuple = <A, B>(p1: Parser<A>, p2: Parser<B>): Parser<[A, B]> =>
  sequence(p1, (r1) => map(p2, (r2) => [r1, r2]));

export const tuple3 = <A, B, C>(
  p1: Parser<A>,
  p2: Parser<B>,
  p3: Parser<C>,
): Parser<[A, B, C]> =>
  sequence(p1, (r1) => sequence(p2, (r2) => map(p3, (r3) => [r1, r2, r3])));

export const tuple4 = <A, B, C, D>(
  p1: Parser<A>,
  p2: Parser<B>,
  p3: Parser<C>,
  p4: Parser<D>,
): Parser<[A, B, C, D]> =>
  sequence(
    p1,
    (r1) =>
      sequence(p2, (r2) =>
        sequence(p3, (r3) => map(p4, (r4) => [r1, r2, r3, r4]))),
  );

export const any = <A>(ps: Array<Parser<A>>): Parser<A> => (input) => {
  if (ps.length === 0) {
    return [error("no match"), input];
  } else {
    const [first, ...others] = ps;
    return or(first, any(others))(input);
  }
};

export const all = <A>(ps: Array<Parser<A>>): Parser<Array<A>> => (input) => {
  if (ps.length === 0) {
    return [[], input];
  } else {
    const [first, ...others] = ps;
    return map(tuple(first, all(others)), ([r1, rs]) => [r1, ...rs])(input);
  }
};

export const many0 = <A>(p: Parser<A>): Parser<Array<A>> => (input) => {
  const [res, rest] = p(input);
  return isError(res)
    ? [[], input]
    : map(many0(p), (results) => [res, ...results])(rest);
};

export const many = many0;

export const many1 = <A>(p: Parser<A>): Parser<Array<A>> =>
  sequence(
    many0(p),
    (res) => res.length > 0 ? success(res) : failure("at least one expected"),
  );

export const preceeded = <A, B>(pre: Parser<B>, p: Parser<A>): Parser<A> =>
  map(tuple(pre, p), ([_, r]) => r);

export const terminated = <A, B>(p: Parser<A>, term: Parser<B>): Parser<A> =>
  map(tuple(p, term), ([r, _]) => r);

export const delimited = <A, B, C>(
  pre: Parser<B>,
  p: Parser<A>,
  term: Parser<C>,
): Parser<A> => preceeded(pre, terminated(p, term));

export const separated0 = <A, S>(
  sep: Parser<S>,
  p: Parser<A>,
): Parser<Array<A>> => or(separated1(sep, p), success([]));

export const separated = separated0;

export const separated1 = <A, S>(
  sep: Parser<S>,
  p: Parser<A>,
): Parser<Array<A>> =>
  map(tuple(p, many0(preceeded(sep, p))), ([first, rest]) => [first, ...rest]);

export const consume = (n: number): Parser<string> => (input) =>
  input.length >= n
    ? [input.slice(0, n), input.slice(n)]
    : [error("not enough input"), input];

export const satisfy =
  (fn: (char: string) => boolean): Parser<string> => (input) =>
    input.length > 0 && fn(input[0])
      ? [input[0], input.slice(1)]
      : [error("does't satisfy condition"), input];

export const char = (char: string): Parser<string> =>
  satisfy((c) => c === char);

export const concat = (p: Parser<Array<string>>): Parser<string> =>
  map(p, (chars) => chars.join(""));

export const token = (token: string): Parser<string> =>
  concat(all([...token].map(char)));

export const letter: Parser<string> = satisfy((c) => /[A-Za-z]/.test(c));

export const digit: Parser<string> = satisfy((c) => /[0-9]/.test(c));

export const alpha: Parser<string> = any([letter, digit]);

export const nat: Parser<number> = map(
  many1(digit),
  (digits) =>
    digits
      .map((digit) => digit.charCodeAt(0) - 48)
      .reverse()
      .reduce((total, digit, i) => total + digit * (10 ** i), 0),
);

export const int = any([
  map(preceeded(char("-"), nat), (n) => n * -1),
  preceeded(char("+"), nat),
  nat,
]);

export const space0 = many0(satisfy((c) => c === " " || c === "\t"));
export const space1 = many1(satisfy((c) => c === " " || c === "\t"));

export const multispace0 = many0(satisfy((c) => /\s/.test(c)));
export const multispace1 = many1(satisfy((c) => /\s/.test(c)));
