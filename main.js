const {
  include,
  type,
  farg,
  fargs,
  ret,
  block,
  func,
  sym,
  str,
  carg,
  cargs,
  call,
} = require('./lib');

const ast = block(
  include('stdio.h'),

  func('main', ret('int'), [
    call('printf', ['Hello, world!\n']),
  ]),
);

console.log(JSON.stringify(ast, null, 2));
