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
  ctx.indentSize = ctx.indentSize || 2;

  ctx.indent = str => str.replace(
    /^([^$])/gm,
    `${new Array(ctx.indentSize + 1).join(' ')}$1`,
  );

  return gen(x, ctx);
};

generators['topLevel'] = (topLevel, ctx) =>
  topLevel.stmts.map(y => gen(y, ctx)).join('');

generators['stmt.block'] = (block, ctx) =>
  `{\n${ctx.indent(
    block.stmts.map(x => gen(x, ctx)).join(''),
  )}}\n`;

generators['stmt.include'] = (include, ctx) =>
  `#include ${include.path}\n`;

generators['type'] = (type) => type.x;

generators['funcdef.ret'] = (ret, ctx) => gen(ret.type, ctx);

generators['stmt.funcdef'] = (funcdef, ctx) => {
  const type = gen(funcdef.ret);

  return `${type} ${funcdef.name}() ${gen({
    nodeType: 'stmt.block',
    stmts: funcdef.stmts,
  }, ctx)}`;
};

generators['stmt.expr'] = (stmtExpr, ctx) =>
  `${gen(stmtExpr.expr, ctx)};\n`;

generators['expr.symbol'] = sym => sym.x;

generators['expr.number'] = num => num.x;

generators['expr.character'] = ch =>
  JSON.stringify(ch.x).replace(
    /^"|"$/g, '\'',
  );

generators['expr.string'] = str => JSON.stringify(str.x);

generators['expr.call'] = (call, ctx) =>
  `${gen(call.target, ctx)}` +
  `(${call.args.map(x => gen(x, ctx)).join(', ')})`;

generators['stmt.return'] = (ret, ctx) =>
  `return ${gen(ret.val, ctx)};\n`;

generators['stmt.struct'] = (struct, ctx) => {
  const { members } = struct;

  return `struct ${struct.name} {\n${ctx.indent(
    Object.keys(members).map(
      k => gen(members[k], ctx),
    ).join(''),
  )}};\n`;
};

generators['struct.field'] = (field, ctx) =>
  `${field.type.x} ${field.name};\n`;

generators['stmt.define'] = (def, ctx) => {
  const args = (() => {
    if (!def.args) {
      return '';
    }

    return `(${def.args.join(', ')})`;
  })();

  const x = (() => {
    if (!def.x) {
      return '';
    }

    return ` ${gen(def.x, ctx).trim().replace(
      /\n/g, ' \\\n',
    )}`;
  })();

  return `#define ${def.name}${args}${x}\n`;
};

generators['expr.subscript'] = (subscript, ctx) =>
  `(${gen(subscript.x, ctx)})[${gen(subscript.y, ctx)}]`;

generators['stmt.if'] = (_if, ctx) =>
  `if (${gen(_if.cond, ctx)}) {\n${ctx.indent(
    _if.stmts.map(x => gen(x, ctx)).join(''),
  )}}\n`;

generators['stmt.goto'] = (_goto, ctx) =>
  `goto ${_goto.label};\n`;

generators['stmt.label'] = label => `${label.name}:\n`;

generators['expr.cast'] = (cast, ctx) =>
  `(${gen(cast.type, ctx)})(${gen(cast.x, ctx)})`;

generators['expr.unary'] = (unary, ctx) =>
  `${unary.op}(${gen(unary.x, ctx)})`;

generators['expr.multary'] = (multary, ctx) =>
  `(${multary.xs.map(x => gen(x, ctx)).join(
    ` ${multary.op} `,
  )})`;

generators['stmt.var'] = (_var, ctx) => {
  const init = (() => {
    if (!_var.init) {
      return '';
    }

    return ` = ${gen(_var.init, ctx)}`;
  })();

  return `${gen(_var.type, ctx)} ${_var.name}${init};\n`;
};
