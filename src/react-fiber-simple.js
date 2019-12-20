/*
 * @Description: 理解react-fiber运行基本原理库，学(chao)习(xi)Foveluy实现的react框架实现和他的博客文章
 * learn from https://github.com/Foveluy/rectx
 * @Author: mengxiang
 * @Date: 2019-11-01 10:51:52
 * @LastEditTime: 2019-12-02 14:45:44
 * @LastEditors: mengxiang
 */

/**
 * @description: react类组件的继承类
 * @param {object} props 组件外部传的props参数
 */
export class Component {
  constructor(props) {
    this.props = props
    this.state = this.state || {}
  }

  setState(updater) {
    scheduleWork(this, updater)
  }

  render() {
    throw 'should implement `render()` function'
  }
}

Component.prototype.isReactComponent = true;

/**
 * @description: 包装React.createElement生成的虚拟dom
 * @param {*}  
 * @return: 
 */
function ReactElement(type, key, props) {
  this.type = type;
  this.key = key;
  this.props = props;
}

/**
 * @description: 生成虚拟dom的方法React.createElement
 */
export const React = {
  nextReactRootIndex: 0,
  /**
   * @param {*} type 元素的 component 类型
   * @param {*} config 元素配置
   * @param {*} children 元素的子元素
   */
  createElement(type, config, children) {
    const props = {};
    let propName;
    config = config || {};

    let key = config.key || null;

    for (propName in config) {
      if (config.hasOwnProperty(propName) && propName !== "key") {
        props[propName] = config[propName];
      }
    }

    let childrenLength = arguments.length - 2;
    if (childrenLength === 1) {
      props.children = Array.isArray(children) ? children : [children];
    } else if (childrenLength > 1) {
      const childArray = [];
      for (let i = 0; i < childrenLength; i++) {
        childArray[i] = arguments[i + 2];
      }
      props.children = childArray;
    }
    return new ReactElement(type, key, props);
  },

  /**
   * 自行添加上文中的render方法
   */
};
// tag 代表了不同的 JSX 类型
const tag = {
  HostComponent: 'host',
  ClassComponent: 'class',
  HostRoot: 'root',
  HostText: 6,
  FunctionalComponent: 1,
  HOST_COMPONENT: 'dom',
}

const EXPIRATION_TIME = 1 // ms async 逾期时间
let nextUnitOfWork = null
let pendingCommit = null

// 每当 render 和 scheduleWork (setState) 触发时，我们都会往 updateQueue 中 push 一个状态
// 然后，进而调用 requestIdleCallback 进行更新
const updateQueue = []

/**
 * @description: React渲染函数，类似于ReactDom.render
 * @param {fn} Vnode 要渲染的组件，我们这里拿class组件举例
 * @param {DomElement} Container 挂载的dom节点
 * @param {fn}  callback 回调函数，render完了之后调用
 */
export function render(Vnode, Container, callback) {
  updateQueue.push({
    fromTag: tag.HostRoot,
    stateNode: Container,
    props: { children: Vnode }
  })

  requestIdleCallback(performWork) //开始干活
}

/**
 * @description: 调用class类的setState时会调用scheduleWork函数
 * @param {fn} instance class函数或者无状态函数
 * @param {object} partialState 新的state
 */
function scheduleWork(instance, partialState) {
  updateQueue.push({
    fromTag: tag.ClassComponent,
    stateNode: instance,
    partialState: partialState
  })
  requestIdleCallback(performWork) //开始干活
}


/**
 * @description: 每次requestIdleCallback调用时执行的函数
 * @param {object} deadline 表示是否这一帧渲染还有时间留给react
 */
function performWork(deadline) {
  workLoop(deadline)
  if (nextUnitOfWork || updateQueue.length > 0) {
    requestIdleCallback(performWork) //继续干
  }
}

/**
 * @description: workLoop 会一次处理 1 个或者多个 Fiber ，具体处理多少个，要看每一帧具体还剩下多少时间，如果一个 Fiber 消耗太多时间，那么就会等到下一帧再处理下一个 Fiber ，如此循环，遍历整个 VDOM 树
 * @param {object} deadline 是否这一帧过期
 */
function workLoop(deadline) {
  if (!nextUnitOfWork) {
    // 一个周期内只创建一次
    // 首次render nextUnitOfWork是这样的
    // {
    //   alternate: undefined
    //   props: {children: {…}}          
    //   stateNode: div#root
    //   tag: "root"
    //  }
    // children里有个重要的参数是type fn App(props)
    nextUnitOfWork = createWorkInProgress(updateQueue)
  }
  while (nextUnitOfWork && deadline.timeRemaining() > EXPIRATION_TIME) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }

  if (pendingCommit) {
    //当全局 pendingCommit 变量被负值
    commitAllwork(pendingCommit)
  }
}

/**
 * @description: 首次render会触发， 作用就是构建 workInProgress 树的顶端并赋值给全局变量 nextUnitOfWork
 * @param {updateQueue} 更新队列
 * @return: 装饰过的fiber节点
 */
function createWorkInProgress(updateQueue) {
  const updateTask = updateQueue.shift()
  if (!updateTask) return

  if (updateTask.partialState) {
    // 证明这是一个setState操作
    updateTask.stateNode._internalfiber.partialState = updateTask.partialState
  }

  const rootFiber =
    updateTask.fromTag === tag.HostRoot
      ? updateTask.stateNode._rootContainerFiber
      : getRoot(updateTask.stateNode._internalfiber)

  return {
    tag: tag.HostRoot,
    stateNode: updateTask.stateNode,
    props: updateTask.props || rootFiber.props,
    alternate: rootFiber // 用于链接新旧的 VDOM
  }
}

function getRoot(fiber) {
  let _fiber = fiber
  while (_fiber.return) {
    _fiber = _fiber.return
  }
  return _fiber
}


/**
 * @description: 开始遍历所有fiber节点
 * @param {object}  orkInProgress 当前的fiber节点
 * @return: nextChild
 */
function performUnitOfWork(workInProgress) {
  const nextChild = beginWork(workInProgress)
  if (nextChild) return nextChild

  // 没有 nextChild, 我们看看这个节点有没有 sibling
  let current = workInProgress
  while (current) {
    //收集当前节点的effect，然后向上传递
    completeWork(current)
    if (current.sibling) return current.sibling
    //没有 sibling，回到这个节点的父亲，看看有没有sibling
    current = current.return
  }
}

/**
 * @description: 根据fiber的类型，选择不同的更新fiber策略
 * @param {object} currentFiber 
 */
function beginWork(currentFiber) {
  switch (currentFiber.tag) {
    case tag.ClassComponent: {
      return updateClassComponent(currentFiber)
    }
    case tag.FunctionalComponent: {
      return updateFunctionalComponent(currentFiber)
    }
    default: {
      return updateHostComponent(currentFiber)
    }
  }
}

/**
 * @description: 更新host、文字或者原生DOM节点
 * @param {currentFiber} 当前的fiber节点
 */
function updateHostComponent(currentFiber) {
  // 当一个 fiber 对应的 stateNode 是原生节点，那么他的 children 就放在 props 里
  if (!currentFiber.stateNode) {
    if (currentFiber.type === null) {
      //代表这是文字节点
      currentFiber.stateNode = document.createTextNode(currentFiber.props)
    } else {
      //代表这是真实原生 DOM 节点
      currentFiber.stateNode = document.createElement(currentFiber.type)
    }
  }
  const newChildren = currentFiber.props.children
  return reconcileChildrenArray(currentFiber, newChildren)
}

/**
 * @description: 更新无状态组件
 * @param {currentFiber} 当前的fiber节点
 */
function updateFunctionalComponent(currentFiber) {
  let type = currentFiber.type
  let props = currentFiber.props
  const newChildren = currentFiber.type(props)

  return reconcileChildrenArray(currentFiber, newChildren)
}

/**
 * @description: 更新class组件
 * @param {currentFiber} 当前的fiber节点
 */
function updateClassComponent(currentFiber) {
  let instance = currentFiber.stateNode
  if (!instance) {
    // 如果是 mount 阶段，构建一个 instance
    instance = currentFiber.stateNode = createInstance(currentFiber)
  }

  // 将新的state,props刷给当前的instance
  instance.props = currentFiber.props
  instance.state = { ...instance.state, ...currentFiber.partialState }

  // 清空 partialState
  currentFiber.partialState = null
  const newChildren = currentFiber.stateNode.render()

  // currentFiber 代表老的，newChildren代表新的
  // 这个函数会返回孩子队列的第一个
  return reconcileChildrenArray(currentFiber, newChildren)
}

/**
 * @description: 创建class组件的实例
 * @param {fiber} class组件
 * @return: class组件的实例
 */
function createInstance(fiber) {
  const instance = new fiber.type(fiber.props)
  instance._internalfiber = fiber
  return instance
}

const PLACEMENT = 1
const DELETION = 2
const UPDATE = 3

function placeChild(currentFiber, newChild) {
  const type = newChild.type

  if (typeof newChild === 'string' || typeof newChild === 'number') {
    // 如果这个节点没有 type ,这个节点就可能是 number 或者 string
    return createFiber(tag.HostText, null, newChild, currentFiber, PLACEMENT)
  }

  if (typeof type === 'string') {
    // 原生节点
    return createFiber(tag.HOST_COMPONENT, newChild.type, newChild.props, currentFiber, PLACEMENT)
  }

  if (typeof type === 'function') {
    const _tag = type.prototype.isReactComponent ? tag.ClassComponent : tag.FunctionalComponent

    return {
      type: newChild.type,
      tag: _tag,
      props: newChild.props,
      return: currentFiber,
      effectTag: PLACEMENT
    }
  }
}

/**
 * @description: 返回currentFiber节点的子节点fiber
 * @param {currentFiber} 当前fiber节点
 * @param {newChildren} 子节点（注意此时是虚拟dom）
 */
function reconcileChildrenArray(currentFiber, newChildren) {
  // 对比节点，相同的标记更新
  // 不同的标记 替换
  // 多余的标记删除，并且记录下来
  const arrayfiyChildren = Array.isArray(newChildren) ? newChildren : [newChildren]

  let index = 0
  let oldFiber = currentFiber.alternate ? currentFiber.alternate.child : null
  let newFiber = null

  while (index < arrayfiyChildren.length || oldFiber !== null) {
    const prevFiber = newFiber
    const newChild = arrayfiyChildren[index]
    const isSameFiber = oldFiber && newChild && newChild.type === oldFiber.type

    if (isSameFiber) {
      newFiber = {
        type: oldFiber.type,
        tag: oldFiber.tag,
        stateNode: oldFiber.stateNode,
        props: newChild.props,
        return: currentFiber,
        alternate: oldFiber,
        partialState: oldFiber.partialState,
        effectTag: UPDATE
      }
    }

    if (!isSameFiber && newChild) {
      newFiber = placeChild(currentFiber, newChild)
    }

    if (!isSameFiber && oldFiber) {
      // 这个情况的意思是新的节点比旧的节点少
      // 这时候，我们要将变更的 effect 放在本节点的 list 里
      oldFiber.effectTag = DELETION
      currentFiber.effects = currentFiber.effects || []
      currentFiber.effects.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling || null
    }

    if (index === 0) {
      currentFiber.child = newFiber
    } else if (prevFiber && newChild) {
      // 这里不懂是干嘛的
      prevFiber.sibling = newFiber
    }

    index++
  }
  return currentFiber.child
}

function createFiber(tag, type, props, currentFiber, effectTag) {
  return {
    type,
    tag,
    props,
    return: currentFiber,
    effectTag,
  }
}

function commitAllwork(topFiber) {
  topFiber.effects.forEach(f => {
    commitWork(f)
  })

  topFiber.stateNode._rootContainerFiber = topFiber
  topFiber.effects = []
  nextUnitOfWork = null
  pendingCommit = null
}

function completeWork(currentFiber) {
  if (currentFiber.tag === tag.ClassComponent) {
    // 用于回溯最高点的 root
    currentFiber.stateNode._internalfiber = currentFiber
  }

  if (currentFiber.return) {
    const currentEffect = currentFiber.effects || [] //收集当前节点的 effect list
    const currentEffectTag = currentFiber.effectTag ? [currentFiber] : []
    const parentEffects = currentFiber.return.effects || []
    currentFiber.return.effects = parentEffects.concat(currentEffect, currentEffectTag)
  } else {
    // 到达最顶端了
    pendingCommit = currentFiber
  }
}


function commitWork(effectFiber) {
  if (effectFiber.tag === tag.HostRoot) {
    // 代表 root 节点没什么必要操作
    return
  }

  // 拿到parent的原因是，我们要将元素插入的点，插在父亲的下面
  let domParentFiber = effectFiber.return
  while (domParentFiber.tag === tag.ClassComponent || domParentFiber.tag === tag.FunctionalComponent) {
    // 如果是 class 就直接跳过，因为 class 类型的fiber.stateNode 是其本身实例
    domParentFiber = domParentFiber.return
  }

  //拿到父亲的真实 DOM
  const domParent = domParentFiber.stateNode
  if (effectFiber.effectTag === PLACEMENT) {
    if (effectFiber.tag === tag.HostComponent || effectFiber.tag === tag.HOST_COMPONENT || effectFiber.tag === tag.HostText) {
      //通过 tag 检查是不是真实的节点
      domParent.appendChild(effectFiber.stateNode)
    }
    // 其他情况
  } else if (effectFiber.effectTag == UPDATE) {
    // 更新逻辑 只能是没实现
  } else if (effectFiber.effectTag == DELETION) {
    //删除多余的旧节点
    commitDeletion(effectFiber, domParent)
  }
}

function commitDeletion(fiber, domParent) {
  let node = fiber
  while (true) {
    if (node.tag == tag.ClassComponent) {
      node = node.child
      continue
    }
    domParent.removeChild(node.stateNode)
    while (node != fiber && !node.sibling) {
      node = node.return
    }
    if (node == fiber) {
      return
    }
    node = node.sibling
  }
}