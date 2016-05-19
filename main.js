/**
 * Created by Conrad on 14/01/15.
 */


var video;
var mask;


var vheight;
var vwidth;

var playing = false;
var playable = false; // set this to true when enough of the video is analysed

var all_regions = [] //build this up while analysed

var threshhold = 140;
function GreenScreen(video_id, canvas_id){
    this.video = new Video(video_id)
    
    this.display_canvas = $(canvas_id)[0]
    this.back_canvas = document.createElement('canvas'); 
    
    this.display_context = this.display_canvas.getContext('2d')
    this.back_context    = this.back_canvas.getContext('2d')

    this.vheight = this.display_canvas.clientHeight;
    this.vwidth  = this.display_canvas.clientWidth;

    this.display_canvas.width  = this.back_canvas.width  = vwidth;
    this.display_canvas.height = this.back_canvas.height = vheight;

    this.analysedSections = {} 
    
    this.analyse = function(){
        
    }
    that = this
    this.video.video.addEventListener('play', function(){that.draw()},false);

   
    this.draw = function (){
        console.log("working")
        this.back_context.drawImage(this.video.video,0,0,this.vwidth,this.vheight);
         
        var video_still = this.back_context.getImageData(0,0,this.vwidth,this.vheight);

        var still_data = video_still.data;

        for (var i=0; i<still_data.length; i+=4){
//            still_data[i+3] = still_data[i+1] > 130 ? 0 : 255;continue;
            g = still_data[i+1]
            if (g<130){continue};
            g = g/255
            r = still_data[i]/255
            b = still_data[i+2]/255
            max = Math.max(r,g,b)
            min = Math.min(r,g,b)

            
            l = (min+max)/2
            
            if (l > 0.6 || l <0.35)
                continue
          
            delta = max-min
            s = l < 0.5 ? delta/(max+min) : delta/(2 - max - min)

            if (s < 0.1)
                continue
            
            h = r == max ? (g-b)/delta : g == max ? 2 + (b-r)/delta : 4 + (r-g)/delta
            
            h*=60

            if (h<110 || h>150)
                continue

            still_data[i+3] = 0; 

        }
        
        video_still.data = still_data

        this.display_context.putImageData(video_still,0,0);
        
        if(this.video.video.paused || this.video.video.ended) return false;
        setTimeout(function(){that.draw()}, 10);
    } 

    this.togglePlayback = function(){
        if (this.video.isPlaying)
            this.video.pause();
        else
            this.video.play();
    }
};

function Video(id){
    this.video = $(id)[0]
    this.isPlaying = false

    this.pause = function(){
        this.video.pause();
        this.isPlaying = false;
    }

    this.play = function(){
        this.video.play();
        this.isPlaying = true;
    }
}


togglePlayback = function(){

    if (playing){
        video.pause();
        mask.pause();
        playing = false;
        $(".video-overlay").animate({opacity: 0.8},200);
    } else {
        video.play();
        mask.play() ;
        playing = true;
        $(".video-overlay").animate({opacity: 0},200);
    }
};

$("#play").click(togglePlayback);
document.addEventListener('DOMContentLoaded', function(){
    video = $("#myVideo")[0];
    mask  = $("#myVideoMask")[0];

    $('.video-container').hide()

    var canvas = $("#canvas")[0];
    var context = canvas.getContext('2d');//canvas where img cutout will be placed

    var maskBack =  document.createElement('canvas');
    var maskBackContext = maskBack.getContext('2d');

    var back = document.createElement('canvas');
    var backContext = back.getContext('2d');

    vheight = canvas.clientHeight;
    vwidth  = canvas.clientWidth;

    canvas.width = vwidth;
    canvas.height = vheight;

    back.width = vwidth;
    back.height = vheight;

    maskBack.width = vwidth;
    maskBack.height = vheight;

    setTimeout(function(){draw2(video,mask,context,backContext,maskBackContext)}, 200)

    video.addEventListener('play', function(){
        //analyse(video,mask,maskBackContext)
        //draw(video,canvas);
        draw2(video,mask,context,backContext,maskBackContext);
    },false);

    shia = new GreenScreen("#shia-vid","#shia-canvas")

},false);

function draw(v,canvas) {

    var frame = Math.floor(v.currentTime*24)
    var regions = all_regions[frame] // get the regions for the frame of the video we're in
    var region_index = 0 // start in the first region
    var next_region_start = regions[region_index][0]
    var region_end = regions[region_index][1]
    var in_region = next_region_start === 0
    //reset background image opacity

    var data = imgData.data
    for (var i=0; i<data.length; i+=4){
        if (i === next_region_start){
            in_region = true;
        }
        if (!in_region){
            data[i+3] = 255;
        } else {
            data[i+3] = 0;
        }
        if (i === region_end){
            in_region = false; [[0,4][8,8]]
            region_index++;
            next_region_start = regions[region_index][0]
            region_end        = regions[region_index][0]
        }
    }

    imgData.data = data;
    // Draw the pixels onto the visible canvas
    canvas.putImageData(imgData,0,0);
    // Start over!
    setTimeout(function(){draw(v)}, 0);
}

function draw2(v,mask,context,backContext,maskBackContext){

    backContext.drawImage(v,0,0,vwidth,vheight);
    maskBackContext.drawImage(mask,0,0,vwidth,vheight)

    var maskData =  maskBackContext.getImageData(0,0,vwidth,vheight);
    var greenData = backContext.getImageData(0,0,vwidth,vheight);

    var mData = maskData.data;
    var gData = greenData.data;

    for (var i=0; i<mData.length; i+=4){
        gData[i+3] = mData[i]
    }
    greenData.data = gData;
    context.putImageData(greenData,0,0);
    if(v.paused || v.ended) return false;
    setTimeout(function(){draw2(v,mask,context,backContext,maskBackContext)}, 10);
}


function analyse(v,mask,maskBackContext){

    if(v.paused || v.ended) return false;
    mask.playbackRate = 1
    var regions = [] //list of tuples determing pixels to include starting from 0,0

    var vidTime = Math.floor(mask.currentTime*24);
    console.log(vidTime)

    maskBackContext.drawImage(mask,0,0,vwidth,vheight);

    var midata = maskBackContext.getImageData(0,0,vwidth,vheight);
    var mdata = midata.data;
    var in_region = false;

    for(var i = 0; i < mdata.length; i+=4) {
        if (!in_region){
            if (mdata[i] > 10){
                in_region = open_region(regions,i)
            }
        } else {
            if (mdata[i] <= 10){
                in_region = close_region(regions,i-4)
            }
        }
    }

    if (mask.currentTime > 0.5){return}
    all_regions.push(regions)

    analyse(v,mask,maskBackContext)
    //setTimeout(function(){ analyse(v,mask,maskBackContext); }, 0);
}

function serial_to_x(length){
    return length % vwidth
}

function open_region(regions,i){
    regions.push([i/4])
    return true
}

function close_region(regions,i){
    regions[regions.length-1].push(i/4)
    return false
}


function nudge24(video){
    var times = []
    while (video.currentTime*24<24){
        video.play()
        setTimeout(function(){video.pause()},1000/24)
        times.push(video.currentTime*24)
    }
    return times
}
// Adapted from http://html5doctor.com/video-canvas-magic/ and shared under a Creative Commons
// Attribution-Non-Commercial 2.0 share alike license. Feel free to change, reuse, modify and extend it.
