var d3 = require('d3');


module.exports = function(fn){
  
  var methods = {
    store: ['selection', 'enter', 'exit', 'transition', 'data']
  , state: ['ease', 'delay', 'duration']
  , promise: ['set', 'increase', 'decrease', 'run', 'chain', 'call', 'serial', 'parallel', 'wait']
  };
  
  var started = false
    , completed = false
    , serial = false
    , running = 0
    , parent = null
    , store = {}
    , stack = []
    , completeFn = d3.functor();
    
  var state = {}; // privat

  function Flow(){
    var self = this;
    
    this.started = false;
    this.completed = false;
    this.__serial = false;
    this._running = 0;
    this._parent = null;
    this._store = {};
    this._stack = [];
    this._completeFn = d3.functor();

    this._state = {}; // private
    this.state = {}; // public
    
    if(fn) this.complete(fn);
    
    ['selection', 'transition'].concat(methods.state).forEach(function(state){
      self.state[state] = function(){ return self._state[state]; };
    });
    
    methods.store.forEach(function(method){
     self.set[method] = function(){
       var args = [].splice.call(arguments, 0)
         , key = args.shift();
       self._stack.push({name: method, args: args, key: key});
       return self;
     }
   });
     
   this.get.selection = function(key){
     var val = this.get(key, 'selection');
     if(!val) return this;
     this._state.selection = val;
     return this;
   };
   
    return this;
  };

  Flow.prototype = {

    start: function(){

      if(!this.started){ 
        this.started = true;
        this._exec();
      }
      return this;
    },
    
    use: function(fn){
      fn(this);
      return this;
    },
    
    reset: function(){
      this._state = {};
      this._stack = [];
      this.started = false;
      this.completed = false;
      return this;
    },

    complete: function(fn){
      this._completeFn = fn;
      if(!started) this.start();
      return this;
    },
    
    inherit: function(instance){
      this.parent(instance);
      if(!this._parent) return this;
      for(var state in this._parent._state) 
        this._state[state] = this._parent._state[state];
      return this;
    },
    
    parent: function(instance){
      if(instance){
        if(instance instanceof Flow.prototype.constructor) this._parent = instance;
        return this;
      } else {
        return this._parent;
      }
    },
  
    _exec: function(){
      var self = this;

      if(this.completed) return;
      
      if(!this._stack[0]){
        if(this._running) return;
        this.completed = true; 
        this._completeFn(this);
        return;
      }

      if(this.__serial && this._running) return;
      
      var promise = this._stack.shift()
        , cmd = promise[0]
        , key = promise[1];
        
      this._running++;

      var resp = this['_'+cmd.name]({name: cmd.name, args: cmd.args} , function(){
        self._running--;
        self._exec();
      });

      if(key) this._store[key] = resp;
  
      this._exec();
    },
    
    _run: function(cmd, done){
      var key = cmd.args[0]
        , val = this._get(key);
      if(!val || !val.name) return this;
      this._stack.push([cmd]);
      done();
    },
    
    _data: function(cmd, done){
      var fn = cmd.args[0]
        , key = cmd.args[1]
        , data;
        
      data = (typeof fn === 'function') ? fn(this) : fn;
      if(this._state.selection) this._state.selection = this._state.selection.data(data, key);
      done();
      return cmd;
    },

    _selection: function(cmd, done){
      var fn = cmd.args[0], self = this;
      this._state.transition = null;
      if(isFn(fn)){
        cmd.selection = fn(this);
      } else {
        cmd.selection = (cmd.args.length > 1) 
                        ? d3.select(cmd.args[0]).selectAll(cmd.args[1])
                        :  (this._state.selection) 
                            ? this._state.selection.selectAll(args[0]) 
                            : d3.selectAll(args[0]);
      }
      this._state.selection = cmd.selection;
      done();
      return cmd;
    },

    _transition: function(cmd, done){
      var self = this
        , fn = cmd.args[0]
        , chain = cmd.args[1];

      var transition = 
      cmd.selection = (this._state.transition) 
                    ? this._state.transition.transition()
                    : (this._state.selection) ? this._state.selection.transition() : null;

      if(transition){

        this._state.transition = transition;

        var state = this._state;
        
        if(state.ease){
          var ease = (Array.isArray(state.ease) 
                && state.ease.length === 1)  ? state.ease[0] : state.ease;
          transition.ease(ease);
        }

        if(state.duration) transition.duration(state.duration[0]);
        if(state.delay) transition.delay(state.delay[0]);

        fn(transition, this);
        
        var count = len(transition);
        transition.each('end', function(){
          if(--count) return;
          if(self.__serial) self._state.transition = null;
          if(chain){
            cmd.instance._state.transition = null;
            cmd.instance.start();
          }
          else done();
        });
        
        if(chain) 
          cmd.instance = this._chain({args: [chain]}, function(){ done() }, true);

      } else done();
      
      return cmd;
    },
    
    _enter: function(cmd, done){

      var el = cmd.args[0]
        , chain = cmd.args[1];
        
      if(typeof el === 'function'){
        chain = el;
        el = null;
      }
      
      cmd.selection = this._state.selection.enter();
      
      if(el){
        var parse = el.split('.');
        cmd.selection = cmd.selection.append(parse[0] || 'div');
        if(parse[1]) cmd.selection.attr('class', parse[1]);
      }
      
      if(chain){
        cmd.instance = this._chain({args: [chain]}, function(){ done() }, true);
        cmd.instance._state.selection = cmd.selection;
        cmd.instance.start();
      } else done();
      
      return cmd;
    },
    
    _exit: function(cmd, done){
      var el = cmd.args[0]
        , chain = cmd.args[1];
        
      if(typeof el === 'function'){
        chain = el;
        el = null;
      }
      
      cmd.selection = this._store.selection.exit();
      
      if(el && el === 'remove'){
        cmd.selection.remove();
        done();
      }
      
      if(chain){
        cmd.instance = this._chain({args: [chain]}, function(){ done() }, true);
        cmd.instance._state.transition = null;
        cmd.instance.start();
      } else done();
      
      return cmd;     
    },
    
    _chain: function(cmd, done, defer){
      var flow = d3.flow()
        .inherit(this)
        .use(cmd.args[0])
        .complete(function(){ return done(); });
        
      if(defer) return flow;
      else cmd.instance = flow.start();
      return cmd;
    },
    
    _call: function(cmd, done){
      var fn = cmd.args[0]
        , params = [this._state.selection, this];
        
     if(fn.length === 3) params.push(function(){ done(); });
     fn.apply(null, params);
     if(fn.length < 3) done();
     
     return cmd;
    },

    _serial: function(cmd, done){
      done(this.__serial = true);
    },

    _parallel: function(cmd, done){
      done(this.__serial = false);
    },
    
    _wait: function(cmd, done){
      var self = this
        , fn = cmd.args[0]
        , strict = cmd.args[1];

      if(!strict && this._running > 1){
        cmd.old = this.__serial;
        this._stack.unshift([{name: 'serial'}], [cmd]);
        return done();
      }

      if(typeof fn === 'function') fn(finish);
      else if (typeof fn === 'number') setTimeout(finish, fn);
      
      function finish(){
        if(!self.strict) self._state.transition = null;
        if(cmd.old) self.__serial = cmd.old;
        done();
      }
    }

  };
  
  methods.state.forEach(function(method){
    Flow.prototype['_'+method] = function(cmd, done){
      this._state[method] = (cmd.args.length == 1) ? cmd.args[0] : cmd.args;
      return this;
    }
  });
  
  [].concat(methods.store, methods.state, methods.promise)
   .forEach(function(method){
    Flow.prototype[method] = function(){
      var args = [].splice.call(arguments, 0);
      this._stack.push([{name: method, args: args}]);
      if(this.started) this._exec();
      return this;
    }
  });
  
  
  function len(selection){
    var i = count = 0
      , l = selection.length;
    for(;i<l;i++) count += selection[i].length;
    return count;
  }
  
  function isFn(fn){
    return (typeof fn === 'function');
  }
  
  return new Flow(); 
  
};