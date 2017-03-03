import c from 'cast';

const ast = c.topLevel(c => {
  c.func('derp', c => {
    c.call('test', c.call('nope'));
  });
});

console.log(JSON.stringify(ast, null, 2));
console.log('===');
console.log(c.stringify(ast));
