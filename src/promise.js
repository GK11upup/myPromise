/*
 * @Author: your name
 * @Date: 2020-09-05 16:47:53
 * @LastEditTime: 2020-09-07 11:09:26
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: /novel-h5/promise.js
 */

/* eslint-disable no-unused-vars */
class Promise {
  // 回调收集
  callbacks = []
  // 返回值保存
  value = null
  // 错误原因
  reason = null
  // 状态管理
  state = 'pending'
  constructor(fn) {
    this._initBind()
    // 传递resolve、和reject方法
    try {
      fn(this._resolve, this._reject)
    } catch (error) {
      this._reject(error)
    }
  }
  _initBind () {
    // 绑定 this
    // 因为 resolve 和 reject 会在 exector 作用域中执行，因此这里需要将 this 绑定到当前的实例
    this._resolve = this._resolve.bind(this)
    this._reject = this._reject.bind(this)
  }

  then (onFulfilled = null, onRejected = null) {
    const me = this
    // 可以使得promise值穿透
    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : value => value
    onRejected = typeof onRejected === "function" ? onRejected : reason => { throw reason }
    let p
    return p = new Promise(function (resolve, reject) {
      setTimeout(() => {
        // 将收集的回调封装成对象
        try {
          me._handle({
            onFulfilled,
            onRejected,
            resolve,
            reject,
            p
          })
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  _handle (cbObj) {
    const me = this
    // 首先判断状态
    if (me.state === 'pending') {
      me.callbacks.push(cbObj)
      return
    }
    // 依据状态获取用户回调
    const cb = me.state === 'fulfilled' ? cbObj.onFulfilled : cbObj.onRejected
    // 异常处理
    try {
      const val = cb(me.state === 'fulfilled' ? me.value : me.reason)
      // 根据回调的返回值，来决定内置promise的状态
      Promise._pResolve(cbObj, val, cbObj.p)
    } catch (error) {
      cbObj.reject(error)
    }
  }

  _resolve (val) {
    const me = this
    if (me.state === 'pending') {
      setTimeout(() => {
        me.value = val
        me.state = 'fulfilled'
        me._execute()
      })
    }
  }
  _reject (reason) {
    const me = this
    if (me.state === 'pending') {
      setTimeout(() => {
        me.reason = reason
        me.state = 'rejected'
        me._execute()
      })
    }
  }
  _execute () {
    const me = this
    me.callbacks.forEach(function (cbObj) {
      me._handle(cbObj)
    })
  }
}
Promise._pResolve = (obj, val, p) => {
  let called = false
  if (p === val) {
    obj.reject(new TypeError("cannot return the same promise object from onfulfilled or on rejected callback."))
    return
  }
  if (val instanceof Promise) {
    if (val.state === 'pending') {
      val.then(v => {
        Promise._pResolve(obj, v, p)
      }, error => {
        obj.reject(error)
      })
    } else val.then(obj.resolve, obj.reject)
  } else if (val && (typeof val === 'object' || typeof val === 'function')) {
    // 判断val是否是promise对象，有没有then方法可以挂载
    try {
      const valThen = val.then
      if (typeof valThen === 'function') {
        // 保持this指向正确，如果不用call，此时then中的this会指向内置promise，而不是用户自己的promise
        valThen.call(val, v => {
          if (called) return
          called = true
          return Promise._pResolve(obj, v, p)
        }, error => {
          if (called) return
          called = true
          return obj.reject(error)
        })
      } else obj.resolve(val)
    } catch (error) {
      if (called) return
      called = true
      return obj.reject(error)
    }
  } else obj.resolve(val)
}

// 测试方法初始化
Promise.deferred = function () {
  const defer = {}
  defer.promise = new Promise((resolve, reject) => {
    defer.resolve = resolve
    defer.reject = reject
  })
  return defer
}

try {
  module.exports = Promise
} catch (e) {
}
