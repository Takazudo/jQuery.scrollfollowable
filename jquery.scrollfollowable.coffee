# encapsulate plugin
do ($=jQuery, window=window, document=document) ->

  $window = $(window)
  $document = $(document)

  ns = {}

  # ============================================================
  # event module

  class ns.Event

    on: (ev, callback) ->
      @_callbacks = {} unless @_callbacks?
      evs = ev.split(' ')
      for name in evs
        @_callbacks[name] or= []
        @_callbacks[name].push(callback)
      @

    once: (ev, callback) ->
      @on ev, ->
        @off(ev, arguments.callee)
        callback.apply(@, arguments)

    trigger: (args...) ->
      ev = args.shift()
      list = @_callbacks?[ev]
      return unless list
      for callback in list
        if callback.apply(@, args) is false
          break
      @

    off: (ev, callback) ->
      unless ev
        @_callbacks = {}
        return @

      evs = ev.split(' ')
      for name in evs

        list = @_callbacks?[name]
        return this unless list

        unless callback
          delete @_callbacks[name]
          return this

        for cb, i in list when cb is callback
          list = list.slice()
          list.splice(i, 1)
          @_callbacks[name] = list
          break
      @

  # ============================================================
  # utils

  ns.calcTopFromView = ($el) ->
    ns.prepareWindow()
    $el.offset().top - $window.scrollTop()

  # ============================================================
  # Window

  class ns.Window extends ns.Event

    constructor: ->
      @_eventify()

    _eventify: ->
      $window.on 'resize orientationchange', =>
        @trigger 'resize'
      $window.on 'scroll', =>
        @trigger 'scroll'

  ns.prepareWindow = ->
    return @ if ns.window?
    ns.window = new ns.Window
    @

  # ============================================================
  # Scrollfollowable

  class ns.Scrollfollowable extends ns.Event
    
    defaults:
      inner: '> *'
      holder: 'body'
      mintopmargin: 10
      minbottommargin: 10

    constructor: (@$el, options) ->
      @options = $.extend {}, @defaults, options
      ns.prepareWindow()
      @_prepareEls()
      @_rememberOriginalCss()
      @_eventify()
      @update()

    _prepareEls: ->
      @$inner = @$el.find @options.inner
      @$holder = $document.find @options.holder
      @

    _rememberOriginalCss: ->
      @_originalCssProps =
        position: @$inner.css('position')
        top: @$inner.css('top')
        left: @$inner.css('left')
      @

    _eventify: ->
      ns.window.on 'resize scroll', @update
      @

    isInnerOverHolder: ->

      return true unless @innerFixed

      holderTop = @$holder.offset().top
      holderH = @$holder.outerHeight()
      holdableTopLimit = holderTop + holderH

      minTopMargin = @options.mintopmargin
      minBottomMargin = @options.minbottommargin
      scrolled = $window.scrollTop()
      innerH = @$inner.outerHeight()

      innerTop = scrolled + minTopMargin + innerH + minBottomMargin

      holded = holdableTopLimit > innerTop

      # store over amount
      if holded
        @_innerOverAmount = null
      else
        @_innerOverAmount = innerTop - holdableTopLimit

      return not holded

    update: =>
      lastInnerFixed = @innerFixed
      fromTop = ns.calcTopFromView @$el
      minTopMargin = @options.mintopmargin
      props = null

      if fromTop < minTopMargin
        # inner should be fixed
        @innerFixed = true
        props = {}

        unless lastInnerFixed
          props.position = 'fixed'

        # calc top
        if @isInnerOverHolder()
          props.top = - @_innerOverAmount
        else
          props.top = minTopMargin

        # calc left
        innerLeft = @$el.offset().left - $window.scrollLeft()
        if @_lastInnerLeft isnt innerLeft
          props.left = innerLeft

      else
        # don't handle fixed
        @innerFixed = false

        if lastInnerFixed is true
          props = @_originalCssProps

      if props
        @$inner.css props

      @trigger 'update'
      @

    destroy: ->
      ns.window.off 'resize scroll', @update
      @$inner.css @_originalCssProps
      @$el.data 'scrollfollowable', null
      @

  # ============================================================
  # bridge to plugin
  
  $.fn.scrollfollowable = (options) ->
    @each (i, el) ->
      $el = $(el)
      instance = new ns.Scrollfollowable $el, options
      $el.data 'scrollfollowable', instance
      @
  

  # ============================================================
  # spread to global
  
  $.ScrollfollowableNs = ns
  $.Scrollfollowable = ns.Scrollfollowable

