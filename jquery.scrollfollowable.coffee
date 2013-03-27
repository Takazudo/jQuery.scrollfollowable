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
      $window.bind 'resize orientationchange', =>
        @trigger 'resize'
      $window.bind 'scroll', =>
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
      keepholderheight: true
      originalcontainerheight: 'auto'

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
      @_originalInnerCssProps =
        position: @$inner.css('position')
        top: @$inner.css('top')
        left: @$inner.css('left')
      @_originalContainerCssProps =
        height: @options.originalcontainerheight
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
          @fixContainerHeight()

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
          props = @_originalInnerCssProps
          @unFixContainerHeight()

      if props and (@anyInnerCssUpdated props)
        @$inner.css props
        @trigger 'update'
        @_lastInnerProps = props

      @

    fixContainerHeight: ->
      return this unless @options.keepholderheight
      @$el.height @$inner.outerHeight()
      return this

    unFixContainerHeight: ->
      return this unless @options.keepholderheight
      @$el.css @_originalContainerCssProps
      return this

    anyInnerCssUpdated: (props) ->
      return true if not @_lastInnerProps?
      a = @_lastInnerProps
      b = props
      for prop in ['position', 'top', 'left']
        if a[prop] isnt b[prop]
          return true
      false

    destroy: ->
      ns.window.off 'resize scroll', @update
      @$inner.css @_originalInnerCssProps
      @$el.data 'scrollfollowable', null
      @

  # ============================================================
  # bridge to plugin
  
  do ->
    dataKey = 'scrollfollowable'
  
    $.fn.scrollfollowable = (options) ->
      @each (i, el) ->
        $el = $(el)
        prevInstance = $el.data dataKey
        if prevInstance
          prevInstance.destroy()
        instance = new ns.Scrollfollowable $el, options
        $el.data dataKey, instance
        @
  

  # ============================================================
  # spread to global
  
  $.ScrollfollowableNs = ns
  $.Scrollfollowable = ns.Scrollfollowable

