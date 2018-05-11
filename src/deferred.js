//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.
//
//     Some code (c) 2005, 2013 jQuery Foundation, Inc. and other contributors


// Deferred.done returns current deferred object
// Deferred.then returns a new deferred object

;(function($){
  var slice = Array.prototype.slice

  function Deferred(func) {
    var tuples = [
          // action, add listener, listener list, final state
          [ "resolve", "done", $.Callbacks({once:1, memory:1}), "resolved" ],
          [ "reject", "fail", $.Callbacks({once:1, memory:1}), "rejected" ],
          [ "notify", "progress", $.Callbacks({memory:1}) ]
        ],
        state = "pending",
        promise = {
          state: function() {
            /*
             * pending, resolved, rejected 
             */
            return state
          },
          always: function() {
            /* 
             *  Push the always callback function to resolve callback list & reject callback list
             */
            deferred.done(arguments).fail(arguments)
            return this
          },
          then: function(/* fnDone [, fnFailed [, fnProgress]] */) {
            var fns = arguments
            return Deferred(function(defer){
              $.each(tuples, function(i, tuple){
                var fn = $.isFunction(fns[i]) && fns[i]
                deferred[tuple[1]](function(){
                  var returned = fn && fn.apply(this, arguments)
                  if (returned && $.isFunction(returned.promise)) {
                    returned.promise()
                      .done(defer.resolve)
                      .fail(defer.reject)
                      .progress(defer.notify)
                  } else {
                    var context = this === promise ? defer.promise() : this,
                        values = fn ? [returned] : arguments
                    defer[tuple[0] + "With"](context, values)
                  }
                })
              })
              fns = null
            }).promise()
          },

          promise: function(obj) {
            return obj != null ? $.extend( obj, promise ) : promise
          }
        },
        deferred = {}

    $.each(tuples, function(i, tuple){
      /*
       * tuple[2] means the callback list of the each actions.
       */
      var list = tuple[2],
          stateString = tuple[3]

      /*
       * tuplep[1] means the function(done, fail, progress), when thease method invoked,
       * the callback function will be added into the list directly.
       */
      promise[tuple[1]] = list.add

      if (stateString) {
        /*
         * when the deferred object is resolved, reject or notified, change the deferred object state accordingly
         * 
         * i^1 means when deferred object is resolved, disable the reject callback list, 
         * when deferred object is rejected, disable the resolve callbacklist.
         * disable means clean the callback list, stack and the memory.
         * 
         * tuples[2][2].lock means when deferred object is resolved, rejected or notified,
         * lock the progress callback list
         */
        list.add(function(){ state = stateString }, tuples[i^1][2].disable, tuples[2][2].lock)
      }

      /*
       * delegate the fireWith function of list to the deferred object.
       * 
       * deferred[resolve] -> deferred[resolveWith] -> list.fireWith
       * deferred[reject] -> deferred[rejectWith] -> list.fireWith
       * deferred[notify] -> deferred[notifyWith] -> list.fireWith
       */
      deferred[tuple[0]] = function(){
        deferred[tuple[0] + "With"](this === deferred ? promise : this, arguments)
        return this
      }
      deferred[tuple[0] + "With"] = list.fireWith
    })

    /*
     * mixin the deferred object with promise object.
     */
    promise.promise(deferred)
    
    /*
     * 
     */
    if (func) func.call(deferred, deferred)

    return deferred
  }

  $.when = function(sub) {
    var resolveValues = slice.call(arguments),
        len = resolveValues.length,
        i = 0,
        remain = len !== 1 || (sub && $.isFunction(sub.promise)) ? len : 0,
        deferred = remain === 1 ? sub : Deferred(),
        progressValues, progressContexts, resolveContexts,
        updateFn = function(i, ctx, val){
          return function(value){
            ctx[i] = this
            val[i] = arguments.length > 1 ? slice.call(arguments) : value
            if (val === progressValues) {
              deferred.notifyWith(ctx, val)
            } else if (!(--remain)) {
              deferred.resolveWith(ctx, val)
            }
          }
        }

    if (len > 1) {
      progressValues = new Array(len)
      progressContexts = new Array(len)
      resolveContexts = new Array(len)
      for ( ; i < len; ++i ) {
        if (resolveValues[i] && $.isFunction(resolveValues[i].promise)) {
          resolveValues[i].promise()
            .done(updateFn(i, resolveContexts, resolveValues))
            .fail(deferred.reject)
            .progress(updateFn(i, progressContexts, progressValues))
        } else {
          --remain
        }
      }
    }
    if (!remain) deferred.resolveWith(resolveContexts, resolveValues)
    return deferred.promise()
  }

  $.Deferred = Deferred
})(Zepto)
