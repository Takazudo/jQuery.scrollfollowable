# encapsulate plugin
do ($=jQuery, window=window, document=document) ->

  $window = $(window)
  $document = $(document)
  
  EveEve = window.EveEve

  ns = {}

  # ============================================================
  # utils

  ns.calcTopFromView = ($el) ->
    ns.prepareWindow()
    $el.offset().top - $window.scrollTop()

  # ============================================================
  # Window

  class ns.Window extends EveEve

    constructor: ->
      @_eventify()

    _eventify: ->
      $window.bind 'resize orientationchange', =>
        @trigger 'resize'
      $window.bind 'scroll', =>
        @trigger 'scroll'
      return this

  ns.prepareWindow = ->
    return @ if ns.window?
    ns.window = new ns.Window
    return this

  # ============================================================
  # HeightWatcher

  class ns.HeightWatcher extends EveEve

    constructor: (@$el) ->
      @_lastHeight = @$el.outerHeight()
      @tick()

    tick: ->
      setTimeout =>
        @check()
        @tick()
      , 250
      return this

    check: ->
      h = @$el.outerHeight()
      if @_lastHeight isnt h
        @_lastHeight = h
        @trigger 'changedetected'
      return this

  # ============================================================
  # Scrollfollowable

  class ns.Scrollfollowable extends EveEve
    
    defaults:
      inner: '> *'
      holder: 'body'
      mintopmargin: 10
      minbottommargin: 10
      keepholderheight: true
      originalcontainerheight: 'auto'
      watchinnerheightchange: false

    constructor: (@$el, options) ->
      @options = $.extend {}, @defaults, options
      ns.prepareWindow()
      @_prepareEls()
      @_rememberOriginalCss()
      @_eventify()
      @update()
      if @options.watchinnerheightchange
        @startWatchingHeight()

    _prepareEls: ->
      @$inner = @$el.find @options.inner
      @$holder = $document.find @options.holder
      return this

    _rememberOriginalCss: ->
      @_originalInnerCssProps =
        position: @$inner.css('position')
        top: @$inner.css('top')
        left: @$inner.css('left')
      @_originalContainerCssProps =
        height: @options.originalcontainerheight
      return this

    _eventify: ->
      ns.window.on 'resize scroll', @update
      return this

    startWatchingHeight: ->
      @_heightWatcher = new ns.HeightWatcher @$inner
      @_heightWatcher.on 'changedetected', @update
      return this

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
          props.top = - @_innerOverAmount + minTopMargin
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

      return this

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
      @unFixContainerHeight()
      @$el.data 'scrollfollowable', null
      return this

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
        return this
  

  # ============================================================
  # spread to global
  
  $.ScrollfollowableNs = ns
  $.Scrollfollowable = ns.Scrollfollowable

