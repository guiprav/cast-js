exports.isNodeType = (node, type) => {
  if (typeof node !== 'object' || !node.nodeType) {
    return false;
  }

  return node.nodeType === type;
};

exports.isNodeClass = (node, _class) => {
  if (typeof node !== 'object' || !node.nodeType) {
    return false;
  }

  return node.nodeType.startsWith(`${_class}.`);
};

exports.include = (path) => ({
  nodeType: 'stmt.include',
  path,
});

exports.type = (x) => ({
  nodeType: 'type',
  x,
});

exports.farg = () => ({
  nodeType: 'funcdef.arg',
});

exports.fargs = (...xs) => ({
  nodeType: 'funcdef.args',
  xs: xs.map(x => exports.farg(x)),
});

exports.ret = (t) => {
  if (typeof t === 'string') {
    t = exports.type(t);
  }

  return {
    nodeType: 'funcdef.ret',
    type: t,
  };
};

exports.stmt = (x) => {
  if (exports.isNodeClass(x, 'expr')) {
    x = {
      nodeType: 'stmt.expr',
      x,
    };
  }

  if (!exports.isNodeClass(x, 'stmt')) {
    throw new Error('Invalid statement');
  }

  return x;
};

exports.topLevel = (...xs) => ({
  nodeType: 'topLevel',
  stmts: xs.map(x => exports.stmt(x)),
});

exports.block = (...xs) => ({
  nodeType: 'stmt.block',
  stmts: xs.map(x => exports.stmt(x)),
});

exports.func = (...xs) => {
  const name = xs.find(
    x => typeof x === 'string',
  );

  if (!name) {
    throw new Error('Missing function name');
  }

  const args = xs.find(
    x => exports.isNodeType(x, 'funcdef.args'),
  ) || exports.fargs();

  const ret = xs.find(
    x => exports.isNodeType(x, 'funcdef.ret'),
  ) || ret('void');

  const body = xs.find(
    x => exports.isNodeType(x, 'stmt.block'),
  ) || exports.block(...xs.find(
    x => Array.isArray(x),
  ) || []);

  return {
    nodeType: 'stmt.funcdef',
    name,
    args,
    ret,
    body,
  };
};

exports.sym = (x) => ({
  nodeType: 'expr.symbol',
  x,
});

exports.str = (x) => ({
  nodeType: 'expr.string',
  x,
});

exports.carg = (x) => {
  if (typeof x === 'string') {
    x = exports.str(x);
  }

  if (!exports.isNodeClass(x, 'expr')) {
    throw new Error('Unexpected call argument node type');
  }

  return x;
};

exports.cargs = (...xs) => ({
  nodeType: 'expr.call.args',
  xs: xs.map(x => exports.carg(x)),
});

exports.call = (...xs) => {
  const fn = xs.find(
    x => exports.isNodeClass(x, 'expr'),
  ) || exports.sym(xs.find(
    x => typeof x === 'string',
  ));

  if (!fn) {
    throw new Error('Missing function expression');
  }

  const args = xs.find(
    x => exports.isNodeType(x, 'expr.call.args'),
  ) || exports.cargs(...xs.find(
    x => Array.isArray(x),
  ) || []);

  return {
    nodeType: 'expr.call',
    fn,
    args,
  };
};
