const { isNodeType, isNodeClass } = require('./helpers');
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

  return {
    nodeType: 'type',
    x,
  };
};

exports.returns = function(type) {
  if (!isNodeType(this, 'stmt.funcdef')) {
    throw new Error(
      'Can\'t declare return type outside function ' +
      'declaration',
    );
  }

  const node = createNode({
    nodeType: 'funcdef.ret',
    type: this.type(type),
  });

  this.ret = node;

  return node;
};

exports.farg = function(name, type) {
  if (!isNodeType(this, 'stmt.funcdef')) {
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

exports.expr = function(x) {
  if (isNodeClass(x, 'expr')) {
    return x;
  }

  return this.sym(x);
};

exports.call = function(target, ...args) {
  const node = createNode({
    nodeType: 'expr.call',
    target: this.expr(target),
    args,
  });

  args.forEach(x => {
    x.nestedExpression = true;
  });

  this.exprStmt(node, { implicit: true });

  return node;
};
