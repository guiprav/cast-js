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
