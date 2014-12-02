$(function() {

  var whileScroll = false;

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
      left: 0,
      itemsLength: 0,
      tableAreaWidth: 0,
      itemWidth: 0,
      maxLeft: 0
    },
    initialize: function() {
      this._lastLeft = 0;
      this._eventify();
    },
    updateLayout: function(itemWidth, tableAreaWidth) {
      var maxLeft = itemWidth * this.get('itemsLength') - tableAreaWidth;
      this.set({
        tableAreaWidth: tableAreaWidth,
        itemWidth: itemWidth,
        maxLeft: maxLeft
      });
    },
    _eventify: function() {
      this.listenTo(vent, 'headScrolled', function(data) {
        if(whileScroll) { return; }
        this.set({ left: data.left });
        this._invokeScrollLeftChange('head');
      });
      this.listenTo(vent, 'bodyScrolled', function(data) {
        if(whileScroll) { return; }
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
      this.listenTo(this, 'change:left', function() {
        var left = this.get('left');
        var maxLeft = this.get('maxLeft');
        if((this._lastLeft === 0) && (left !== 0)) {
          vent.trigger('leftChangedFromMin');
        }
        if((this._lastLeft !== 0) && (left === 0)) {
          vent.trigger('leftChangedToMin');
        }
        if((this._lastLeft === maxLeft) && (left !== maxLeft)) {
          vent.trigger('leftChangedFromMax');
        }
        if((this._lastLeft !== maxLeft) && (left === maxLeft)) {
          vent.trigger('leftChangedToMax');
        }
        this._lastLeft = left;
      });
    },
    _invokeScrollLeftChange: function(fromStr) {
      var from = {};
      from[fromStr] = true; // ex: from.button === true
      vent.trigger('scrollLeftChanged', this.get('left'), from);
    },
    _calcCurrentScrollIndex: function() {
      var scrollLeft = this.get('left');
      var currentMinLeft;
      var currentMaxLeft;
      var itemWidth = this.get('itemWidth');
      var res = 0;
      for(var i=0, l=8; i<l; i+=1) {
        currentMinLeft = itemWidth * i;
        currentMaxLeft = itemWidth * (i+1);
        if(currentMinLeft <= scrollLeft && scrollLeft <= currentMaxLeft) {
          res = i;
        }
      }
      return res;
    },
    _calcNextLeft: function(scrollingToLeft) {
      var currentIndex = this._calcCurrentScrollIndex();
      var nextIndex = scrollingToLeft ? (currentIndex + 1) : (currentIndex - 1);
      //console.log(currentIndex, nextIndex, this.get('tableAreaWidth'));
      var itemWidth = this.get('itemWidth');
      var maxLeft = this.get('maxLeft');
      if(nextIndex < 0) {
        return 0;
      }
      if(nextIndex >= 7) {
        //console.log('returning maxLeft!');
        return maxLeft;
      }
      var res = nextIndex * itemWidth;
      if(res > maxLeft) {
        //console.log('maxLeft adjusted', res);
        res = maxLeft;
      }
      return res;
    }
  });
  
  var scrollManager = new ScrollManager();
  
  var ScrollableTable = Backbone.View.extend({
    events: {
      'scroll': '_nofityScroll'
    },
    initialize: function() {
      this._eventify();
    },
    _updateScrollLeft: function(left, animate) {
      left = Math.round(left);
      if(animate) {
        this.$el.stop().animate({
          scrollLeft: left
        }, {
          duration: 400,
          easing: 'easeInOutExpo',
          start: function() { whileScroll = true; },
          always: function() { whileScroll = false; }
        });
      } else {
        this.$el.scrollLeft(left);
      }
    }
  });

  var Head = ScrollableTable.extend({
  
    initialize: function() {
      ScrollableTable.prototype.initialize.apply(this, arguments);
      var $tds = this.$('td');
      scrollManager.set({
        itemsLength: $tds.length
      });
      var itemWidth = $tds.eq(0).width() + 1; // +1 for border
      var tableAreaWidth = this.$el.width();
      scrollManager.updateLayout(itemWidth, tableAreaWidth);
    },
    _nofityScroll: function() {
      vent.trigger('headScrolled', {
        left: this.$el.scrollLeft()
      });
    },
    _eventify: function() {
      this.listenTo(vent, 'scrollLeftChanged', function(left, from) {
        if(from.head) { return; }
        var animate = from.button ? true : false;
        this._updateScrollLeft(left, animate);
      });
    }
  });
  
  var Button = Backbone.View.extend({
    _class_disabled: 'disabled',
    events: {
      'click': '_clickHandler'
    },
    initialize: function() {
      this._eventify();
    },
    _disable: function() {
      this.$el.addClass(this._class_disabled);
    },
    _enable: function() {
      this.$el.removeClass(this._class_disabled);
    }
  });
  
  var Button_left = Button.extend({
    initialize: function() {
      Button.prototype.initialize.apply(this, arguments);
      this._disable();
    },
    _eventify: function() {
      this.listenTo(vent, 'leftChangedFromMin', this._enable);
      this.listenTo(vent, 'leftChangedToMin', this._disable);
    },
    _clickHandler: function() {
      vent.trigger('scrollToRightRequested');
    }
  });
  
  var Button_right = Button.extend({
    _eventify: function() {
      this.listenTo(vent, 'leftChangedFromMax', this._enable);
      this.listenTo(vent, 'leftChangedToMax', this._disable);
    },
    _clickHandler: function() {
      vent.trigger('scrollToLeftRequested');
    }
  });
  
  var Main = ScrollableTable.extend({
    _nofityScroll: function() {
      vent.trigger('bodyScrolled', {
        left: this.$el.scrollLeft()
      });
    },
    _eventify: function() {
      this.listenTo(vent, 'scrollLeftChanged', function(left, from) {
        if(from.body) { return; }
        var animate = from.button ? true : false;
        this._updateScrollLeft(left, animate);
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
