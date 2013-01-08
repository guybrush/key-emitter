var keyTable = require('key-table')
var EE2 = require('eventemitter2').EventEmitter2
 
exports = module.exports = Input
exports.keyTable = keyTable
 
function Input(opts) {
  if (!(this instanceof input)) return new input(opts)
  EE2.call(this,{wildcard:true,delimiter:'::',maxListeners: 20})
  var self = this
  opts = opts || {}
  self.el = opts.el || window
  self.data = 
    { mouse_x:0, mouse_y:0
    , mouse_down:false, mouse_down_x:0, mouse_down_y:0, mouse_wheel_delta:0
    , mouse_right:false, mouse_left:false, mouse_middle:false
    , wheel_delta:0 }
  self._stopPropagation = opts.stopPropagation
  self._preventDefault = opts.preventDefault
  self.keyTable = keyTable
  self._activated = false
  self.patterns = {}
  self.definedPatterns = {}
  
  // self.handlers =
  //   [ { handler: onContextmenu , listeners: [ 'contextmenu'    ] , method: 'oncontextmenu' }
  //   , { handler: onMouseWheel  , listeners: [ 'mousewheel'
  //                                           , 'DOMMouseScroll' ] , method: 'onmousewheel' }
  //   , { handler: onMouseDown   , listeners: [ 'onMouseDown'    ] , method: 'onmousedown' }
  //   , { handler: onMouseMove   , listeners: [ 'onMouseMove'    ] , method: 'onmousemove' }
  //   , { handler: onMouseUp     , listeners: [ 'onMouseUp'      ] , method: 'onmouseup' }
  //   , { handler: onKeyDown     , listeners: [ 'onKeyDown'      ] , method: 'onmousewheel' }
  //   , { handler: onKeyUp       , listeners: [ 'onKeyUp'        ] , method: false }
  //   ]
  
  self.listeners =
    { 'contextmenu'    : onContextmenu
    , 'mousewheel'     : onMouseWheel
    , 'mousedown'      : onMouseDown
    , 'mousemove'      : onMouseMove
    , 'mouseup'        : onMouseUp
    , 'keydown'        : onKeyDown
    , 'keyup'          : onKeyUp }
 
  self.activate()
  
  Object.keys(self.keyTable).forEach(function(x,i){
    self.data[self.keyTable[x]] = false
  })
  
  Object.keys(self.data).forEach(function(x,i){
    self.last_input[x] = self.data[x]
  })
 
  function handleBubbling(e) {
    if (self._preventDefault) e.preventDefault()
    if (self._stopPropagation) e.stopPropagation()
    if (self._stopPropagation) return false
  }
 
  function onContextmenu(e) {
    e.preventDefault()
    return false
    
    self.emit('event::contextmenu',e)
    return handleBubbling(e)
  }
  function onMouseMove(e){
    self.set('mouse_x',e.clientX - (window.innerWidth/2))
    self.set('mouse_y',e.clientY - (window.innerHeight/2))
    self.emit('event::mouse::move',e)
    return handleBubbling(e)
  }
  function onMouseWheel(e){
    self.set('mouse_wheel_delta',e.wheelDelta)
    self.emit('event::mouse::wheel',e)
    return handleBubbling(e)
  }
  function onMouseDown(e){
    if (e.button === 0) self.set('mouse_left',true)
    if (e.button === 1) self.set('mouse_middle',true)
    if (e.button === 2) self.set('mouse_right',true)
 
    var x = e.clientX - (window.innerWidth/2)
    var y = e.clientY - (window.innerHeight/2)
    self.set('mouse_down_x',x)
    self.set('mouse_down_y',y)
    self.set('mouse_down',true)
    self.emit('event::mouse::down',e)
    return handleBubbling(e)
  }
  function onMouseUp(e){
    if (e.button == 0) self.set('mouse_left',false)
    if (e.button == 1) self.set('mouse_middle',false)
    if (e.button == 2) self.set('mouse_right',false)
    self.set('mouse_down',false)
    // set('mouse_down_x',false)
    // set('mouse_down_y',false)
    var x = e.clientX - self.data.mouse_down_x
    var y = e.clientY - self.data.mouse_down_y
    self.set('mouse_down_x',x)
    self.set('mouse_down_y',y)
    self.set('mouse_x',x)
    self.set('mouse_y',y)
    self.emit('event::mouse::up',e)
    return handleBubbling(e)
  }
  function onKeyDown(e){
    self.emit('keydown',e)
    self.set(self.keyTable[e.keyCode],true)
    self.checkKeyChange()
    self.emit('event::key::down',e)
    return handleBubbling(e)
  }
  function onKeyUp(e){
    self.emit('keyup',e)
    self.set(self.keyTable[e.keyCode],false)
    self.checkKeyChange()
    self.emit('event::key::up',e)
    return handleBubbling(e)
  }
}
 
Input.prototype = EE2.prototype
 
Input.prototype.set = function(k,v){
  if (!k) return
  if (!~Object.keys(this.data).indexOf(k)) return
  v = v || false
  this.data[k] = v
  this.emit('set::'+k,v)
}
 
Input.prototype.activate = function(active){
  var self = this
  Object.keys(self.listeners).forEach(function(x){
    window.addEventListener(x, self.listeners[x], false)
  })
  self._activated = true
  self.emit('activate')
}
 
Input.prototype.deactive = function(){
  var self = this
  Object.keys(self.listeners).forEach(function(x){
    window.RemoveEventListener(x, self.listeners[x], false)
  })
  self._activated = false
  self.emit('deactivate')
}
 
Input.prototype.stopPropagation = function() {
  this._stopPropagation = true
}
 
Input.prototype.unstopPropagation = function() {
  this._stopPropagation = false
}
 
Input.prototype.preventDefault = function() {
  this._preventDefault = true
}
 
Input.prototype.unpreventDefault = function() {
  this._preventDefault = false
}
 
Input.prototype.definePattern = function(name,pattern){
  var obj = {}
  for (var i = 0, len = pattern.length; i < len; i++){
    obj[pattern[i]] = false 
  }
  this.definedPatterns[name] = pattern
  this.patterns[name] = obj
}
 
Input.prototype.watchPatterns = function(diff){
  var self = this
  Object.keys(self.definedPatterns).forEach(function(p,n){
    var p = self.definedPatterns[p]
    var k = Object.keys(diff)
    for (var i = 0, len = k.length; i < len; i++){
      if (p.indexOf(k[i]) != -1){
        self.patterns[n][k[i]] = diff[k[i]]
        var result = {}
        Object.keys(self.patterns[n]).forEach(function(x){
          result[x] = self.patterns[n][x]
        })
        self.emit('pchange::'+n,result,n)
      }
    }
  })
}
