var d3 = require('d3')
  , flow = require('../lib/flow');

addEventListener('DOMContentLoaded', function(){ 
  var offset = [];
  var t = null;
  var started = null;
  var count = 17;
  var midpoint = 8;
  var els;
  
  
  flow()
    .serial()
    .selection('body', '.cell')
    .data(d3.range(0, count))
    .enter('.cell')
    .call(spaceLeft(200, 35))
    .wait(1000)
    .parallel()
    .transition(dropDownTo('350px', { 
        ease: 'bounce', duration: 1400, offset: midpoint, multipler: 100 
    }))
    .transition(circleTwist)
    .transition(colorFade)
    .serial()
    .transition(toCircle)
    .parallel()
    .transition(aroundInCircles)
    .transition(toWhite)
    .serial()
    .wait(1000)
    .transition(expandCircle)
    .transition(toZeroPoint)
    .start();
    
    
    

    function spaceLeft(start_x, offset){
      return function(selection){
        selection
        .style('top', '0px')
        .style('left', function(d,i){ return (i * offset) + start_x + 'px'; })
        .style('background', '#000')
        .style("-webkit-transform", "rotate(0deg)")
      }
    }

    function dropDownTo(top, options){
      return function(transition){
        transition
          .ease(options.ease)
          .duration(options.duration)
          .delay(function(d,i){ return Math.abs(i-options.offset) * options.multipler; })
          .style('top', top)
      }
    }
    
    function circleTwist(transition){
      var color = d3.interpolate('#000000', '#FFFFFF');
      transition
        .ease("cubic-in-out")
        .duration(1000)
        .delay(function(d,i){
          var idx = Math.abs(i-midpoint);
          return (idx * 100) + 1200;
        })
        .tween('circle', function(d, i){
          var x = (i > midpoint) ? (i*35)+300 : (i*35)+100;
          var c = interpolateCircle(x ,350, 100);
          return function(t){
            if(i == midpoint) return;
            if(i > midpoint) t -= 0.5;
            if(t < 0) t = 1-(0-t);
            var pos = c(t);
            d3.select(this)
              .style('left', parseInt(pos[0])+'px')
              .style('top', parseInt(pos[1])+'px')
              .style("-webkit-transform", "rotate("+(360*t)+"deg)")
          }
        })
    }
    
    function colorFade(transition){
      var color = d3.interpolate('#000000', '#FFFFFF');
      transition
        .duration(3000)
        .delay(function(d,i){
          var idx = Math.abs(i-8);
          return (idx * 100) ;
        })
        .styleTween('background', function(d,i){
          return function(t){
           var x = t*2;
           return color((x > 1) ? 1-(x-1) : x);
          }
        })
    }
    
    function toCircle(transition){
      var circle = interpolateCircle(475, 350, 150);
      var multipler = 1 / count;
      els = [];
      transition
        .duration(1000)
        .style('left', function(d,i){
          els[i] = [circle(multipler*i)[0]];
          return els[i][0]+'px';
        })
        .style('top', function(d, i){
          els[i].push(circle(multipler*i)[1], multipler*i);
          return els[i][1]+'px';
        })
        .style("-webkit-transform", function(d,i){ return "rotate("+(360*multipler*i)+"deg)"; })
    }
    
    function aroundInCircles(transition){
      var c = interpolateCircle(475, 350, 150);
      transition
        .ease('cubic')
        .duration(2000)
        .delay(function(d,i){ return i* 50; })
        .tween('circle', function(d, i){
          return function(t){
            t += els[i][2];
            if(t > 1) t -= 1;
            var pos = c(t);
            d3.select(this)
              .style('left', parseInt(pos[0])+'px')
              .style('top', parseInt(pos[1])+'px')
              .style("-webkit-transform", function(d,i){ return "rotate("+(360*t)+"deg)"; })
          }
        })
    }
    
    function toWhite(transition){
      transition
      .ease('cubic')
      .delay(function(d, i){
        return  (count-i)*100 + 2000;
      }).duration(1200).style('background', '#FFF');
    }
    
    function expandCircle(transition){
      var circle = interpolateCircle(475, 350, 200);
      var multipler = 1 / count;
      transition
        .ease('cubic')
        .duration(800)
        .style('left', function(d,i){
          els[i] = [circle(multipler*i)[0]];
          return els[i][0]+'px';
        })
        .style('top', function(d, i){
          els[i].push(circle(multipler*i)[1], multipler*i);
          return els[i][1]+'px';
        })
    }
    
    function toZeroPoint(transition){
      transition
        .duration(400)
        .delay(function(d, i){ return (i % 4) * 50; })
        .style('left', '475px')
        .style('top', '350px')
        .style("-webkit-transform", "rotate(0deg)")
    }
    

    function interpolateCircle(x,y,r){
      return function(t){
        var angle = 360 * t;
        var radians = (angle/180) * Math.PI;
        return [x + Math.cos(radians) * r, y + Math.sin(radians) * r];
      }
    }

});
