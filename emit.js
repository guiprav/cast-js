const emitters = {};

function emit(x, ctx) {
  const emitter = emitters[x.nodeType];

  if (!emitter) {
    throw new Error(`Missing emitter for ${x.nodeType}`);
  }

  return emitters[x.nodeType](x, ctx);
}

module.exports = (x, ctx = {}) => {
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

  emit(x, ctx);

  return ctx.code;
};

emitters['topLevel'] = (topLevel, ctx) => {
  topLevel.stmts.forEach(y => emit(y, ctx));
};

emitters['stmt.block'] = (block, ctx) => {
  ctx.writeln('{');
  ++ctx.indentLvl;

  block.stmts.forEach(y => emit(y, ctx));

  --ctx.indentLvl;
  ctx.writeln('}');
};

emitters['stmt.include'] = (include, ctx) => {
  ctx.writeln(`#include ${include.path}`);
};

emitters['type'] = (type) => type.x;

emitters['funcdef.ret'] = (ret, ctx) => emit(ret.type, ctx);

emitters['stmt.funcdef'] = (funcdef, ctx) => {
  const type = emit(funcdef.ret);

  ctx.write(`${type} ${funcdef.name}() `);

  emit(funcdef.body, ctx);
};

emitters['stmt.expr'] = (stmtExpr, ctx) => {
  ctx.writeln(`${emit(stmtExpr.x, ctx)};`);
};

emitters['expr.symbol'] = (sym) => sym.x;

emitters['expr.string'] = (str) => JSON.stringify(str.x);

emitters['expr.call.args'] = (args, ctx) =>
  `(${args.xs.map(x => emit(x, ctx)).join(', ')})`;

emitters['expr.call'] = (call, ctx) =>
  `${emit(call.fn, ctx)}${emit(call.args, ctx)}`;
