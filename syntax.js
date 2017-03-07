const {
  isNodeType,
  isNodeClass,
  filterNullNodes,
} = require('./helpers');
const st = require('./state');

function createNode(data) {
  return Object.assign(Object.create(exports), data);
}

function fixStmts(node) {
  node.stmts = node.stmts.filter(stmt => (
    !isNodeType(stmt, 'stmt.expr')
    || !stmt.implicitlyCreated
    || !stmt.expr.nestedExpression
  ));
}

exports.topLevel = function(fn) {
  const node = createNode({
    nodeType: 'topLevel',
    stmts: [],
  });

  fn && fn(node);
  fixStmts(node);

  return node;
};

exports.include = function(path) {
  const node = createNode({
    nodeType: 'stmt.include',
    path,
  });

  if (!Array.isArray(this.stmts)) {
    throw new Error('Can\'t append statement to a non-block');
  }

  this.stmts.push(node);

  return node;
};

exports.type = function(x) {
  if (isNodeType(x, 'type')) {
    return x;
  }

  const node = {
    nodeType: 'type',
  };

  const xs = x.split(' ');

  (() => {
    let x;

    while(x = xs.shift()) {
      switch (x) {
        case 'const':
          node.const = true;
          break;

        case 'volatile':
          node.volatile = true;
          break;

        case 'auto':
        case 'extern':
        case 'static':
        case 'register':
          if (node.storage) {
            throw new Error('Can\'t mix storage specifiers');
          }

          node.storage = x;
          break;

        default:
          xs.unshift(x);
          return;
      }
    }
  })();

  node.storage = node.storage || 'auto';

  node.x = xs.join(' ');

  return node;
};

exports.const = function(x) {
  x = this.type(x);

  x.const = true;

  return x;
};

exports.notConst = function(x) {
  x = this.type(x);

  delete x.const;

  return x;
};

exports.volatile = function(x) {
  x = this.type(x);

  x.volatile = true;

  return x;
};

exports.notVolatile = function(x) {
  x = this.type(x);

  delete x.volatile;

  return x;
};

exports.storage = function(spec, x) {
  x = this.type(x);

  x.storage = spec;

  return x;
};

exports.ptr = function(...xs) {
  let lvl = 1;

  if (xs.length >= 2) {
    lvl = xs.shift();
  }

  const node = this.type(xs[0]);

  node.ptr = (node.hasOwnProperty('ptr') && node.ptr) || 0;
  node.ptr += lvl;

  return node;
};

exports.dropPtr = function(...xs) {
  let lvl = 1;

  if (xs.length >= 2) {
    lvl = xs.shift();
  }

  const node = this.type(xs[0]);

  node.ptr -= lvl;

  if (node.ptr < 0) {
    delete node.ptr;
  }

  return node;
};

exports.fnPtr = function(fn) {
  const node = createNode({
    nodeType: 'type',
    fnPtr: true,
    args: [],
  });

  fn(node);

  return node;
};

exports.array = function(...xs) {
  const sizes = (() => {
    const ys = [];

    while(typeof xs[0] === 'number' || xs[0] === 'n') {
      ys.push(xs.shift());
    }

    return ys;
  })();

  if (!sizes.length) {
    sizes.push('n');
  }

  const node = this.type(xs[0]);

  node.array =
    (node.hasOwnProperty('array') && node.array) || [];

  node.array.push(...sizes);

  return node;
};

exports.returns = function(type) {
  if (
    !isNodeType(this, 'stmt.funcdef')
    && !this.fnPtr
  ) {
    throw new Error(
      'Can\'t declare return type outside function ' +
      'declaration',
    );
  }

  this.returnType = this.type(type);

  return this.returnType;
};

exports.farg = function(name, type) {
  if (
    !isNodeType(this, 'stmt.funcdef')
    && !this.fnPtr
  ) {
    throw new Error(
      'Can\'t declare argument outside function declaration',
    );
  }

  const node = createNode({
    nodeType: 'funcdef.arg',
    name,
    type: this.type(type),
  });

  this.args.push(node);

  return node;
};

exports.func = function(name, fn) {
  const node = createNode({
    nodeType: 'stmt.funcdef',
    name,
    args: [],
    stmts: [],
  });

  node.returns('void');

  this.stmts.push(node);

  fn && fn(node);
  fixStmts(node);

  return node;
};

exports.exprStmt = function(expr, { implicit } = {}) {
  if (!Array.isArray(this.stmts)) {
    throw new Error('Can\'t append statement to a non-block');
  }

  const node = createNode({
    nodeType: 'stmt.expr',
    implicitlyCreated: !!implicit,
    expr,
  });

  this.stmts.push(node);

  return node;
};

exports.sym = function(x) {
  if (isNodeType(x, 'expr.symbol')) {
    return x;
  }

  return {
    nodeType: 'expr.symbol',
    x,
  };
};

exports.num = function(x) {
  if (isNodeType(x, 'expr.number')) {
    return x;
  }

  return {
    nodeType: 'expr.number',
    x,
  };
};

exports.char = function(x) {
  if (isNodeType(x, 'expr.character')) {
    return x;
  }

  return {
    nodeType: 'expr.character',
    x,
  };
};

exports.expr = function(x) {
  if (isNodeClass(x, 'expr')) {
    return x;
  }

  switch (typeof x) {
    case 'string':
      return this.sym(x);

    case 'number':
      return this.num(x);

    default:
      throw new Error('Invalid expression');
  }
};

exports.nestedExpr = function(x) {
  const node = this.expr(x);

  node.nestedExpression = true;

  return node;
};

exports.str = function(x) {
  if (isNodeType(x, 'expr.string')) {
    return x;
  }

  return {
    nodeType: 'expr.string',
    x,
  };
};

exports.call = function(target, ...args) {
  args = filterNullNodes(args);

  const node = createNode({
    nodeType: 'expr.call',
    target: this.nestedExpr(target),
    args: args.map(x => this.nestedExpr(x)),
  });

  if (!isNodeType(this, 'stmt.define')) {
    this.exprStmt(node, { implicit: true });
  }

  return node;
};

exports.return = function(val) {
  if (!Array.isArray(this.stmts)) {
    throw new Error('Can\'t append statement to a non-block');
  }

  const node = createNode({
    nodeType: 'stmt.return',
    val: this.nestedExpr(val),
  });

  this.stmts.push(node);

  return node;
};

exports.struct = function(name, fn) {
  if (!Array.isArray(this.stmts)) {
    throw new Error('Can\'t append statement to a non-block');
  }

  const node = createNode({
    nodeType: 'stmt.struct',
    name,
    members: {},
  });

  fn && fn(node);

  this.stmts.push(node);

  return node;
};

exports.field = function(name, type) {
  if (!isNodeType(this, 'stmt.struct')) {
    throw new Error(
      'Can\'t declare field outside struct declaration',
    );
  }

  const node = createNode({
    nodeType: 'struct.field',
    name,
    type: this.type(type),
  });

  this.members[name] = node;

  return node;
};

exports.nullNode = () => ({
  nodeType: 'null',
});

exports.define = function(name, fn) {
  if (!Array.isArray(this.stmts)) {
    throw new Error('Can\'t append statement to a non-block');
  }

  const node = createNode({
    nodeType: 'stmt.define',
    name,
  });

  node.x = fn && fn(node);

  this.stmts.push(node);

  return node;
};

exports.darg = function(...xs) {
  if (!isNodeType(this, 'stmt.define')) {
    throw new Error(
      'Can\'t declare argument outside macro definition',
    );
  }

  this.args = this.args || [];
  this.args.push(...xs);
};

exports.block = function(fn) {
  if (
    !Array.isArray(this.stmts)
    && !isNodeType(this, 'stmt.define')
  ) {
    throw new Error('Can\'t append statement to a non-block');
  }

  const node = createNode({
    nodeType: 'stmt.block',
    stmts: [],
  });

  fn && fn(node);

  this.stmts && this.stmts.push(node);

  return node;
};

exports.at = function(x, y) {
  return {
    nodeType: 'expr.subscript',
    x: this.nestedExpr(x),
    y: this.nestedExpr(y),
  };
};

exports.op = function(op, ...xs) {
  xs = filterNullNodes(xs).map(x => this.nestedExpr(x));

  if (xs.length === 1) {
    return {
      nodeType: 'expr.unary',
      op,
      x: xs[0],
    };
  }

  return {
    nodeType: 'expr.multary',
    op,
    xs,
  };
};

exports.not = function(x) {
  return this.op('!', x);
};

exports.star = function(x) {
  return this.op('*', x);
};

exports.amp = function(x) {
  return this.op('&', x);
};

exports.and = function(...xs) {
  return this.op('&&', ...xs);
};

exports.or = function(...xs) {
  return this.op('||', ...xs);
};

exports.neq = function(...xs) {
  return this.op('!=', ...xs);
};

exports.eq = function(...xs) {
  return this.op('==', ...xs);
};

exports.lt = function(...xs) {
  return this.op('<', ...xs);
};

exports.gt = function(...xs) {
  return this.op('>', ...xs);
};

exports.lte = function(...xs) {
  return this.op('<=', ...xs);
};

exports.gte = function(...xs) {
  return this.op('>=', ...xs);
};

exports.add = function(...xs) {
  return this.op('+', ...xs);
};

exports.sub = function(...xs) {
  return this.op('-', ...xs);
};

exports.mult = function(...xs) {
  return this.op('*', ...xs);
};

exports.div = function(...xs) {
  return this.op('/', ...xs);
};

exports.mod = function(...xs) {
  return this.op('%', ...xs);
};

exports.if = function(cond, fn) {
  if (
    !Array.isArray(this.stmts)
    && !isNodeType(this, 'stmt.define')
  ) {
    throw new Error('Can\'t append statement to a non-block');
  }

  const node = createNode({
    nodeType: 'stmt.if',
    cond: this.nestedExpr(cond),
    stmts: [],
    elseClauses: [],
  });

  fn && fn(node);
  fixStmts(node);

  this.stmts && this.stmts.push(node);

  return node;
};

exports.else = function(fn) {
  if (!isNodeType(this, 'stmt.if')) {
    throw new Error(
      'Can\'t add else clause to non-if statement.',
    );
  }

  const lastElseClause =
    this.elseClauses[this.elseClauses.length - 1];

  if (isNodeType(lastElseClause, 'if.else')) {
    throw new Error('Else clauses aren\'t chainable.');
  }

  const node = createNode({
    nodeType: 'if.else',
    stmts: [],
  });

  fn && fn(node);
  fixStmts(node);

  this.elseClauses.push(node);

  return this;
};

exports.goto = function(label, fn) {
  if (
    !Array.isArray(this.stmts)
    && !isNodeType(this, 'stmt.define')
  ) {
    throw new Error('Can\'t append statement to a non-block');
  }

  const node = {
    nodeType: 'stmt.goto',
    label,
  };

  this.stmts && this.stmts.push(node);

  return node;
};

exports.label = function(name) {
  if (
    !Array.isArray(this.stmts)
    && !isNodeType(this, 'stmt.define')
  ) {
    throw new Error('Can\'t append statement to a non-block');
  }

  const node = {
    nodeType: 'stmt.label',
    name,
  };

  this.stmts && this.stmts.push(node);

  return node;
};

exports.assign = function(...xs) {
  const node = this.op('=', ...xs);

  if (!isNodeType(this, 'stmt.define')) {
    this.exprStmt(node, { implicit: true });
  }

  return node;
};

exports.var = function(name, type, init) {
  if (
    !Array.isArray(this.stmts)
    && !isNodeType(this, 'stmt.define')
  ) {
    throw new Error('Can\'t append statement to a non-block');
  }

  const node = {
    nodeType: 'stmt.var',
    name,
    type: this.type(type),
  };

  init && (node.init = this.nestedExpr(init));

  this.stmts && this.stmts.push(node);

  return node;
};

exports.cast = function(type, x) {
  return {
    nodeType: 'expr.cast',
    type: this.type(type),
    x: this.nestedExpr(x),
  };
};

exports.nullNode = () => ({
  nodeType: 'null',
});
