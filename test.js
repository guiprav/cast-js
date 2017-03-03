import c from 'cast';

const ast = c.topLevel(c => {
  c.include('<stdio.h>');

  c.func('main', c => {
    c.returns('int');

    c.call('printf', c.str('Hello, world.\n'));

    c.return(0);
  });
});

console.log(JSON.stringify(ast, null, 2));
console.log('===');
console.log(c.stringify(ast));
