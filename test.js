const {
  topLevel,
  include,
  ret,
  func,
  call,
} = require('./lib');

const emit = require('./emit');

const ast = topLevel(
  include('<stdio.h>'),

  func('main', ret('int'), [
    call('printf', ['Hello, world!\n']),
  ]),
);

console.log(JSON.stringify(ast, null, 2));
console.log('===');
console.log(emit(ast));
