const generators = {};

function gen(x, ctx) {
  const generator = generators[x.nodeType];

  if (!generator) {
    throw new Error(
      `Missing code generator for ${x.nodeType}`,
    );
  }

  return generator(x, ctx);
}

exports.stringify = (x, ctx = {}) => {
  ctx.code = '';
  ctx.indentLvl = 0;
  ctx.indentSize = ctx.indentSize || 2;

  ctx.indent = () => {
    ctx.code += new Array(
      ctx.indentLvl * ctx.indentSize + 1,
    ).join(' ');
  };

  ctx.write = (str) => {
    ctx.indent();
    ctx.code += str;
  };

  ctx.writeln = (ln) => {
    ctx.indent();
    ctx.code += `${ln}\n`;
  };

  gen(x, ctx);

  return ctx.code;
};

generators['topLevel'] = (topLevel, ctx) => {
  topLevel.stmts.forEach(y => gen(y, ctx));
};

generators['stmt.block'] = (block, ctx) => {
  ctx.writeln('{');
  ++ctx.indentLvl;

  block.stmts.forEach(y => gen(y, ctx));

  --ctx.indentLvl;
  ctx.writeln('}');
};

generators['stmt.include'] = (include, ctx) => {
  ctx.writeln(`#include ${include.path}`);
};

generators['type'] = (type) => type.x;

generators['funcdef.ret'] = (ret, ctx) => gen(ret.type, ctx);

generators['stmt.funcdef'] = (funcdef, ctx) => {
  const type = gen(funcdef.ret);

  ctx.write(`${type} ${funcdef.name}() `);

  gen({
    nodeType: 'stmt.block',
    stmts: funcdef.stmts,
  }, ctx);
};

generators['stmt.expr'] = (stmtExpr, ctx) => {
  ctx.writeln(`${gen(stmtExpr.expr, ctx)};`);
};

generators['expr.symbol'] = (sym) => sym.x;

generators['expr.number'] = (sym) => sym.x;

generators['expr.string'] = (str) => JSON.stringify(str.x);

generators['expr.call'] = (call, ctx) =>
  `${gen(call.target, ctx)}` +
  `(${call.args.map(x => gen(x, ctx)).join(', ')})`;

generators['stmt.return'] = (ret, ctx) =>
  ctx.writeln(`return ${gen(ret.val, ctx)};`);
