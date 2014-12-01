$(function() {

  var vent = _.clone(Backbone.Events);

  var DebugBar = Backbone.View.extend({
    initialize: function() {
      var $attach = $('#attach');
      var $destroy = $('#destroy');
      var $counter = $('#counter');
      $attach.on('click', function() {
        vent.trigger('attachClicked');
      });
      $destroy.on('click', function() {
        vent.trigger('destroyClicked');
      });
    }
  });

  var ScrollManager = Backbone.Model.extend({
    defaults: {
      left: 0
    },
    _invokeScrollLeftChange: function(fromStr) {
      vent.trigger('scrollLeftChanged', this.get('left'), {
        from: fromStr
      });
    },
    _calcNextLeft: function(scrollingToLeft) {
      var scrollLeft = this.get('left');
      var currentLeft = 0;
      var nextLeft;
      var itemWidth = 200;
      var res;
      var i = 0;
      while(res === undefined) {
        nextLeft = currentLeft + itemWidth;
        if(currentLeft === scrollLeft && scrollingToLeft) {
          res = nextLeft;
          break;
        }
        if(nextLeft === scrollLeft && !scrollingToLeft) {
          res = currentLeft;
          break;
        }
        if(currentLeft < scrollLeft && scrollLeft < nextLeft) {
          if(scrollingToLeft) {
            res = nextLeft;
          } else {
            res = currentLeft;
          }
          break;
        } else {
          currentLeft = nextLeft;
        }
        i += 1;
        if(i > 200) {
          console.log('overflowed');
          break;
        }
      }
      return res;
    },
    initialize: function() {
      this.listenTo(vent, 'headScrolled', function(data) {
        this.set({ left: data.left });
        this._invokeScrollLeftChange('head');
      });
      this.listenTo(vent, 'bodyScrolled', function(data) {
        this.set({ left: data.left });
        this._invokeScrollLeftChange('body');
      });
      this.listenTo(vent, 'scrollToLeftRequested', function() {
        var left = this._calcNextLeft(true);
        this.set({ left: left });
        this._invokeScrollLeftChange('button');
      });
      this.listenTo(vent, 'scrollToRightRequested', function() {
        var left = this._calcNextLeft(false);
        this.set({ left: left });
        this._invokeScrollLeftChange('button');
      });
    }
  });
  
  var scrollManager = new ScrollManager();

  var Head = Backbone.View.extend({
  
    events: {
      'scroll': '_nofityScroll'
    },
    initialize: function() {
      this._eventify();
    },
    _nofityScroll: function() {
      vent.trigger('headScrolled', {
        left: this.$el.scrollLeft()
      });
    },
    _eventify: function() {
      this.listenTo(vent, 'scrollLeftChanged', function(left, from) {
        if(from.head) { return; }
        this.$el.scrollLeft(left);
      });
    }
  });
  
  var Button_left = Backbone.View.extend({
    events: {
      'click': '_clickHandler'
    },
    initialize: function() {
    },
    _clickHandler: function() {
      vent.trigger('scrollToLeftRequested');
    }
  });
  
  var Button_right = Backbone.View.extend({
    events: {
      'click': '_clickHandler'
    },
    initialize: function() {
    },
    _clickHandler: function() {
      vent.trigger('scrollToRightRequested');
    }
  });
  
  var Main = Backbone.View.extend({
    events: {
      'scroll': '_nofityScroll'
    },
    initialize: function() {
      this._eventify();
    },
    _nofityScroll: function() {
      vent.trigger('bodyScrolled', {
        left: this.$el.scrollLeft()
      });
    },
    _eventify: function() {
      this.listenTo(vent, 'scrollLeftChanged', function(left, from) {
        if(from.body) { return; }
        this.$el.scrollLeft(left);
      });
    }
  });

  
  var $headBase = $('#headBase');
  var $headFloater = $('#headFloater');
  
  var instance;

  var attach = function() {
    $headBase.scrollfollowable({
      inner: '#headFloater',
      holder: '#tableSet',
      mintopmargin: 0,
      minbottommargin: 0
    });
    instance = $headBase.data('scrollfollowable');
    instance.on('update', function() {
      //$counter.html( $counter.html()*1 + 1 );
    });
  };

  var destroy = function() {
    instance.destroy();
  };
  
  vent.on('attachClicked', function() {
    attach();
  });
  vent.on('destroyClicked', function() {
    destroy();
  });

  //$attach.on('click', attach);
  //$destroy.on('click', destroy);

  attach();
  
  var head = new Head({ el: '#head' });
  var main = new Main({ el: '#main' });
  var button_left = new Button_left({ el: '#headLeftButton' });
  var button_right = new Button_right({ el: '#headRightButton' });
  
});
