var currentPosition = -1;
var currentSlide;
var slideAnims = {};

function slideId(slide) { 
  return $("#slideshow > div").eq(slide).attr('id'); 
}
function getIfAnim(slide) {
  if(isAnim(slide)) return slideAnims[slideId(slide)];
  else return null;
}
function isAnim(slide) {
  return slideAnims.hasOwnProperty(slideId(slide));
}
function changeSlide(slide) {
  var arr = $("#slideshow > div");
  var n = arr.length;
  if(slide<0 || slide>=n || slide == currentPosition) return;
  var anim = getIfAnim(slide);
  if(anim) {
    if(slide>currentPosition) anim.jumpTo(0,0);
    else anim.jumpTo(0,0); //anim.numFrames-1);
  }
  currentPosition = slide;
  window.location.hash="#"+currentPosition;
  arr.each(function(k,v) {
    if(k==slide) {
      $(this).show(); 
      currentSlide = $(this);
    }else $(this).hide();
  })
}
function resizeAll() {
  var h = $("body").height(), w = $("body").width();
  var r=4.0/3;
  if(h>w/r) h = w/r; else if(w>h*r) w=h*r;
  var left = ($("body").width()-w)/2.0;
  $("#slideshow").css({height:h+"px", width:w+"px", left:left});
  $('body').css('font-size',$("#slideshow").height()*0.05+'px');
  $(".slideNumber").css({'left':-left+"px"});
}
$(document).ready(function() {
  // Write out slide numbers
  var slides = $("#slideshow > div");
  $("#slideshow > div").append(function(i) {
    if($(this).hasClass("hideSlideNumber")) return "";
    else return "<div class='slideNumber'>"+i+"</div>";
  });

  // Default to 0 if an initial slide is not specified in URL hash
  var init = window.location.hash.substring(1);
  if(!init) init = 0;
  else init = parseInt(init);
  changeSlide(init);

  // Do resize, and keep resizing at every resize event
  resizeAll();
  $(window).resize(resizeAll);
  $(document).on("webkitfullscreenchange mozfullscreenchange fullscreenchange",resizeAll);

  // Keyboard navigation
  $(document).keydown(function(event){
    var anim = getIfAnim(currentPosition);
    if(event.keyCode == 40 || event.keyCode == 34) {
      if(anim && !anim.atLastFrame()) anim.move(+1);
      else changeSlide(currentPosition+1);
    } else if(event.keyCode == 38 || event.keyCode == 33) 
      //if(anim && !anim.atFirstFrame()) anim.move(-1);
      //else 
        changeSlide(currentPosition-1);
    });
});

// ---------------------- Begin animation stuff -------------------------------

var fastSpeed = { duration: 200, easing: "linear" };

function SlideAnim() {
  this.numFrames = 0;
  this.curFrame = 0;
  this.proceed = function() {};
  this.retreat = function() {};
  this.move = function(x) {
    while(x>0 && this.curFrame<this.numFrames-1) { this.proceed(); --x; }
    while(x<0 && this.curFrame>0) { this.retreat(); ++x; }
  };
  this.jumpTo = function() {};
  this.playTo = function(x) {
    this.move(x-this.curFrame);
  };
  this.atLastFrame = function() { return this.curFrame == this.numFrames-1; };
  this.atFirstFrame = function() { return this.curFrame == 0; };
}

var animateToList = function(l,opt) 
{ 
  for(var sel in l) 
    $(sel).animate(l[sel],opt); 
}

/*
keyframes: an array of keyframe, where a keyframe can be one of two things:
an object of css properties that can be fed into
$.animate() or $.css(), or an array of such objects. For any keyframe that 
is an array, the animation can be paused only at its first element.
   */
function keyFrameList(keyframes) {
  var res = new SlideAnim();
  var n = keyframes.length;
  res.numFrames = n;
  res.keyframes = keyframes;

  // Convert single objects to single element arrays
  keyframes = keyframes.slice(); // don't modify original object, copy it
  for(var i=0;i<n;++i) if(!(keyframes[i] instanceof Array))
    keyframes[i]=[keyframes[i]];

  var lastFrame = function(f) {
    var kf = keyframes[f];
    return kf[kf.length-1];
  };
  var firstFrame = function(f) {
    return keyframes[f][0];
  };

  var getOptions = function(f) { 
    if(f.__options__) return f.__options__;
    else return {};
  }

  var subProceed = function(l,cur,last) {
    var curOptions = $.extend({},getOptions(l[cur]));
    if(cur+1<l.length) {
      curOptions.done = function(){subProceed(l,cur+1,last); }
      animateToList(l[cur+1],curOptions);
    }
    else last();
  }
  res.__inAnim = false;
  res.proceed = function() {
    var i = res.curFrame;
    var l;
    if(res.__inAnim) return;
    res.__inAnim=true;
    l = keyframes[i];
    // pause after start frame of next keyframe
    subProceed(l,0,function(){ 
        if(i>=res.numFrames-1) return;
        res.curFrame = i+1;
        animateToList(firstFrame(i+1),getOptions(l[l.length-1]));
        res.__inAnim=false;
    });
  }

  // TODO make this more sensible:
  //   if x change to y in proceed, it should change back to x on retreat
  //   even if that attribute is not specified on the previous frame
  var subRetreat = function(l,cur,last) {
    if(cur-1>=0) {
      var curOptions = getOptions(l[cur-1]);
      curOptions.done = function() { subRetreat(l,cur-1,last); };
      animateToList(l[cur-1],curOptions);
    }else last();
  }
  res.retreat = function() {
    var i = res.curFrame;
    if(i<=0) return;
    res.curFrame = i-1;
    subRetreat(keyframes[i-1],keyframes[i-1].length,function(){
        var fr = firstFrame(i-1);
        animateToList(fr,getOptions(fr));
    });
  }
  res.jumpTo = function(to,subto) {
    var kf;
    if(typeof subto == "undefined") {
      if(to<=res.curFrame) kf = lastFrame(to);
      else if(to>res.curFrame) kf = firstFrame(to);
    } else kf = keyframes[to][subto];
    res.curFrame = to;
    for(var sel in kf) $(sel).css(kf[sel]);
  }
  res.jumpTo(0);
  return res;
}
