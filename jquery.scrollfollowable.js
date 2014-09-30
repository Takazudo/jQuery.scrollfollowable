/*! jQuery.scrollfollowable (https://github.com/Takazudo/jQuery.scrollfollowable)
 * lastupdate: 2014-09-30
 * version: 0.1.3
 * author: 'Takazudo' Takeshi Takatsudo <takazudo@gmail.com>
 * License: MIT */
(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  (function($, window, document) {
    var $document, $window, EveEve, ns;
    $window = $(window);
    $document = $(document);
    EveEve = window.EveEve;
    ns = {};
    ns.calcTopFromView = function($el) {
      ns.prepareWindow();
      return $el.offset().top - $window.scrollTop();
    };
    ns.Window = (function(_super) {

      __extends(Window, _super);

      function Window() {
        this._eventify();
      }

      Window.prototype._eventify = function() {
        var _this = this;
        $window.bind('resize orientationchange', function() {
          return _this.trigger('resize');
        });
        $window.bind('scroll', function() {
          return _this.trigger('scroll');
        });
        return this;
      };

      return Window;

    })(EveEve);
    ns.prepareWindow = function() {
      if (ns.window != null) {
        return this;
      }
      ns.window = new ns.Window;
      return this;
    };
    ns.HeightWatcher = (function(_super) {

      __extends(HeightWatcher, _super);

      function HeightWatcher($el) {
        this.$el = $el;
        this._lastHeight = this.$el.outerHeight();
        this.tick();
      }

      HeightWatcher.prototype.tick = function() {
        var _this = this;
        setTimeout(function() {
          _this.check();
          return _this.tick();
        }, 250);
        return this;
      };

      HeightWatcher.prototype.check = function() {
        var h;
        h = this.$el.outerHeight();
        if (this._lastHeight !== h) {
          this._lastHeight = h;
          this.trigger('changedetected');
        }
        return this;
      };

      return HeightWatcher;

    })(EveEve);
    ns.Scrollfollowable = (function(_super) {

      __extends(Scrollfollowable, _super);

      Scrollfollowable.prototype.defaults = {
        inner: '> *',
        holder: 'body',
        mintopmargin: 10,
        minbottommargin: 10,
        keepholderheight: true,
        originalcontainerheight: 'auto',
        watchinnerheightchange: false
      };

      function Scrollfollowable($el, options) {
        this.$el = $el;
        this.update = __bind(this.update, this);
        this.options = $.extend({}, this.defaults, options);
        ns.prepareWindow();
        this._prepareEls();
        this._rememberOriginalCss();
        this._eventify();
        this.update();
        if (this.options.watchinnerheightchange) {
          this.startWatchingHeight();
        }
      }

      Scrollfollowable.prototype._prepareEls = function() {
        this.$inner = this.$el.find(this.options.inner);
        this.$holder = $document.find(this.options.holder);
        return this;
      };

      Scrollfollowable.prototype._rememberOriginalCss = function() {
        this._originalInnerCssProps = {
          position: this.$inner.css('position'),
          top: this.$inner.css('top'),
          left: this.$inner.css('left')
        };
        this._originalContainerCssProps = {
          height: this.options.originalcontainerheight
        };
        return this;
      };

      Scrollfollowable.prototype._eventify = function() {
        ns.window.on('resize scroll', this.update);
        return this;
      };

      Scrollfollowable.prototype.startWatchingHeight = function() {
        this._heightWatcher = new ns.HeightWatcher(this.$inner);
        this._heightWatcher.on('changedetected', this.update);
        return this;
      };

      Scrollfollowable.prototype.isInnerOverHolder = function() {
        var holdableTopLimit, holded, holderH, holderTop, innerH, innerTop, minBottomMargin, minTopMargin, scrolled;
        if (!this.innerFixed) {
          return true;
        }
        holderTop = this.$holder.offset().top;
        holderH = this.$holder.outerHeight();
        holdableTopLimit = holderTop + holderH;
        minTopMargin = this.options.mintopmargin;
        minBottomMargin = this.options.minbottommargin;
        scrolled = $window.scrollTop();
        innerH = this.$inner.outerHeight();
        innerTop = scrolled + minTopMargin + innerH + minBottomMargin;
        holded = holdableTopLimit > innerTop;
        if (holded) {
          this._innerOverAmount = null;
        } else {
          this._innerOverAmount = innerTop - holdableTopLimit;
        }
        return !holded;
      };

      Scrollfollowable.prototype.update = function() {
        var fromTop, innerLeft, lastInnerFixed, minTopMargin, props;
        lastInnerFixed = this.innerFixed;
        fromTop = ns.calcTopFromView(this.$el);
        minTopMargin = this.options.mintopmargin;
        props = null;
        if (fromTop < minTopMargin) {
          this.innerFixed = true;
          props = {};
          if (!lastInnerFixed) {
            props.position = 'fixed';
          }
          this.fixContainerHeight();
          if (this.isInnerOverHolder()) {
            props.top = -this._innerOverAmount + minTopMargin;
          } else {
            props.top = minTopMargin;
          }
          innerLeft = this.$el.offset().left - $window.scrollLeft();
          if (this._lastInnerLeft !== innerLeft) {
            props.left = innerLeft;
          }
        } else {
          this.innerFixed = false;
          if (lastInnerFixed === true) {
            props = this._originalInnerCssProps;
            this.unFixContainerHeight();
          }
        }
        if (props && (this.anyInnerCssUpdated(props))) {
          this.$inner.css(props);
          this.trigger('update');
          this._lastInnerProps = props;
        }
        return this;
      };

      Scrollfollowable.prototype.fixContainerHeight = function() {
        if (!this.options.keepholderheight) {
          return this;
        }
        this.$el.height(this.$inner.outerHeight());
        return this;
      };

      Scrollfollowable.prototype.unFixContainerHeight = function() {
        if (!this.options.keepholderheight) {
          return this;
        }
        this.$el.css(this._originalContainerCssProps);
        return this;
      };

      Scrollfollowable.prototype.anyInnerCssUpdated = function(props) {
        var a, b, prop, _i, _len, _ref;
        if (this._lastInnerProps == null) {
          return true;
        }
        a = this._lastInnerProps;
        b = props;
        _ref = ['position', 'top', 'left'];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          prop = _ref[_i];
          if (a[prop] !== b[prop]) {
            return true;
          }
        }
        return false;
      };

      Scrollfollowable.prototype.destroy = function() {
        ns.window.off('resize scroll', this.update);
        this.$inner.css(this._originalInnerCssProps);
        this.unFixContainerHeight();
        this.$el.data('scrollfollowable', null);
        return this;
      };

      return Scrollfollowable;

    })(EveEve);
    (function() {
      var dataKey;
      dataKey = 'scrollfollowable';
      return $.fn.scrollfollowable = function(options) {
        return this.each(function(i, el) {
          var $el, instance, prevInstance;
          $el = $(el);
          prevInstance = $el.data(dataKey);
          if (prevInstance) {
            prevInstance.destroy();
          }
          instance = new ns.Scrollfollowable($el, options);
          $el.data(dataKey, instance);
          return this;
        });
      };
    })();
    $.ScrollfollowableNs = ns;
    return $.Scrollfollowable = ns.Scrollfollowable;
  })(jQuery, window, document);

}).call(this);
