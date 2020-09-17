const compileUtil = {
  // 在vm.$data中取出类似于 person.name 的值
  getValue(expr, vm) {
    const exprs = expr.split(".");
    // console.log(exprs);
    let temp = vm.$data;
    exprs.forEach((e) => {
      temp = temp[e];
    });
    // console.log(temp);
    return temp;
  },
  // 元素节点，属性值，vm实例对象
  text(node, expr, vm) {
    let value;
    if (expr.indexOf("{{") !== -1) {
      value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
        // console.log(args[1]);
        return this.getValue(args[1], vm);
        // console.log(value)
      });
    } else {
      value = this.getValue(expr, vm);
    }
    this.updater.textUpdater(node, value);
  },
  html(node, expr, vm) {
    const value = this.getValue(expr, vm);
    // console.log(value);
    this.updater.htmlUpdater(node, value);
  },
  model(node, expr, vm) {
    const value = this.getValue(expr, vm);
    this.updater.modelUpdater(node, value);
  },
  bind() {},
  on(node, expr, vm, eventName) {
    // expr: handleClick eventName: click
    const fn = vm.$options.methods && vm.$options.methods[expr];
    node.addEventListener(eventName, fn.bind(vm), false);
  },
  updater: {
    textUpdater(node, value) {
      node.textContent = value;
    },
    htmlUpdater(node, value) {
      node.innerHTML = value;
    },
    modelUpdater(node, value) {
      node.value = value;
    },
  },
};

// 编译 HTML 模板对象
class Compiler {
  constructor(el, vm) {
    this.el = this.isElementNode(el) ? el : document.querySelector(el);
    this.vm = vm;
    // 1. 先预编译的元素节点放入文档片段中，避免DOM频繁的回流的重绘，提高渲染性能
    const fragments = this.nodeToFragments(this.el);
    // 2. 编译模板（文档片段）
    this.compile(fragments);
    // 3. 追加子元素到根元素
    this.el.appendChild(fragments);
  }
  // 将文档节点转移到文档片段（内存）中
  nodeToFragments(node) {
    // 创建文档片段
    const f = document.createDocumentFragment();
    let firstChild;
    while ((firstChild = node.firstChild)) {
      f.appendChild(firstChild);
    }
    return f;
  }
  // 编译模板
  compile(fragments) {
    // 1. 获取子节点
    const childNodes = fragments.childNodes;
    // 2. 递归循环编译 Array.from(childNodes)
    [...childNodes].forEach((child) => {
      // console.log(child.nodeType);
      // 如果是元素节点
      if (this.isElementNode(child)) {
        // 编译元素
        this.compileElementNode(child);
      } else {
        // 编译文本
        this.compileContentNode(child);
      }
      // 对子元素递归遍历
      if (child.childNodes && child.childNodes.length) {
        this.compile(child);
      }
    });
  }
  // 编译元素节点
  compileElementNode(node) {
    // console.log(node);
    // 取到元素节点的属性节点
    const attributes = node.attributes;
    Array.from(attributes).forEach((attr) => {
      const { name, value } = attr; // v-text="msg"  v-html=htmlStr  type="text"  v-model="msg"
      // 判断属性名是不是一个指令
      if (this.isDirective(name)) {
        // v-text  v-html  v-model  v-bind  v-on:click v-bind:href=''
        // console.log(name);
        // 数组转字符串，取出其中的
        const [, directive] = name.split("-");
        // console.log(directive); // text  html  model  on:click bind:href=''
        const [compileKey, detailStr] = directive.split(":");
        // console.log(compileKey); // text  html  model  on  bind
        // 更新数据，数据驱动视图
        compileUtil[compileKey](node, value, this.vm, detailStr);

        // 去除元素中的指令
        node.removeAttribute(name);
      } else if (this.isEventName(name)) {
        // 判断属性名是不是@符号
        let [, eventName] = name.split("@");
        compileUtil["on"](node, value, this.vm, eventName);
      }
    });
  }
  // 编译文本节点
  compileContentNode(node) {
    // console.log(node.nodeValue)
    // console.log(node.textContent)
    const content = node.nodeValue;
    if (/\{\{(.+?)\}\}/.test(content)) {
      // console.log(content);
      compileUtil["text"](node, content, this.vm);
    }
  }
  // 判断传递过来的参数是不是元素节点
  isElementNode(node) {
    // 元素节点的 nodeType 属性为1
    return node.nodeType === 1;
  }
  // 判断传递过来的属性名是不是一个指令
  isDirective(name) {
    return name.startsWith("v-");
  }
  // 判断传递过来的属性名起始元素是不是@
  isEventName(name) {
    return name.startsWith("@");
  }
}

class MyVue {
  constructor(options) {
    // 初始元素与数据通过 options 对象绑定
    this.$el = options.el;
    this.$data = options.data;
    this.$options = options;
    // 通过 Compiler 对象实例对模板进行编译，例如 {{}}插值、v-text、v-html等
    if (this.$el) {
      // 1. 创建观察者
      // 2. 编译模板
      new Compiler(this.$el, this);
      // 3. 通过数据代理实现 this.person.name = "孟刘" 的功能，而不是 this.$data.person.name
    }
  }
}
