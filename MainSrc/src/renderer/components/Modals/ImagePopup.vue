<template>
	<div ref="imgModal" class="image-modal" tabindex="-1" @keydown="KeyDown" @keydown.space="KeyDownSpace" @keydown.left="Prev" @keydown.right="Next">
		<div class="img-bg" ref="imgBg" v-if="tweet!=undefined">
			<Tweet ref="tweet" v-show="uiOption.isShowTweet" :tweet="tweet" :option="uiOption" class="tweet-odd"/>
      <div class="image-content" v-if="Video.type=='photo'" @mousewheel="MouseWheel">
				<div class="arrow" v-if="tweet.orgTweet.extended_entities.media.length > 1 && !isZoom">
					<div class="left-button">
						<i class="fas fa-chevron-left fa-2x" @click="Prev"></i>
					</div>
					<div class="right-button">
						<i class="fas fa-chevron-right fa-2x" @click="Next"></i>
					</div>
				</div>
				<div ref="imgDiv" v-show="i==index" v-for="(image,i) in tweet.orgTweet.extended_entities.media" :key="i" class="img-div">
					<img ref="img" :src="ImgPath(image.media_url_https)" class="img-content" :class="{'zoom':isZoom}"
					:style="{'transform': 'translate('+marginLeft+'px'+','+marginTop+'px)',
										'max-width': maxWidth==0? '100%' : maxWidth+'px', 'max-height': maxHeight == 0 ? '100%' : maxHeight+'px'}"
					@mousedown="MouseDown" @mouseleave="MouseLeave" @mouseup="MouseUp" @mousemove="MouseMove"/>
				</div>
			</div>
      <div class="bottom" v-if="Video.type=='photo'">
				<div v-for="(image,i) in tweet.orgTweet.extended_entities.media" @click="ChangeImage(i)"
					:key="i" class="img-preview">
						<img :src="image.media_url_https" class="bottom-preview"/>
						<ProgressBar ref="progress" :percent="listProgressPercent[i]"/>
					</div>
			</div>
      <div class="video" v-if="Video.type!='photo'">
        <video ref="video" controls autoplay muted loop v-if="Video.video_info.variants[0].content_type=='application/x-mpegURL'">
        </video>
				<video ref="video2" controls autoplay muted loop v-if="Video.video_info.variants[0].content_type!='application/x-mpegURL'">
					<source :src="Video.video_info.variants[0].url"
          :type="Video.video_info.variants[0].content_type">
        </video>
      </div>
		</div>
		<ContextMenu ref="context" v-if="tweet!=undefined" :id="tweet.orgTweet.id_str" :index="index" :images="tweet.orgTweet.extended_entities.media"/>
	</div>
</template>

<script>
const app = require('electron').remote.app
import ApiOAuth from "../APICalls/OAuthCall.js"
import Tweet from "../Tweet/Tweet.vue"
import {EventBus} from '../../main.js';
import ImagePopupVue from './ImagePopup.vue'
import ProgressBar from '../Common/ProgressBar.vue'
import ContextMenu from '../ContextMenu/ImageContextMenu.vue'
import Hls from 'hls.js'

export default {
	name: 'imagemodal',
	components:{
		Tweet,
		ProgressBar,
		// BootStrap,
		Tweet,
		ContextMenu
  },
  computed:{
		ZoomAble(){
			var div = this.$refs.imgDiv[this.index];
			var img = this.$refs.img[this.index];
			if(div.clientHeight<=img.clientHeight || div.clientWidth <= img.clientWidth)///img가 그림 배경보다 클 경우에만 zoom동작
				return true; 
			else
			  return false;
		},
    Video(){
      if(this.tweet.orgTweet.extended_entities.media.length > 0)
        return this.tweet.orgTweet.extended_entities.media[0];
      else
        return undefined;
    },
    VideoHeight(){
      if(this.tweet==undefined)
        return 0;
      this.$nextTick(()=>{
        return this.$refs.imgBg.clientHeight - this.$refs.tweet.$el.clientHeight;
      });
    }
  },
  data () {
    return {
			path:'',
			uiOption:undefined,
			listProgressPercent:Array(0,0,0,0),
			isZoom:false,
			tweet:undefined,
			index:0,
			isDrag:false,
			prevX:0,
			prevY:0,
			startX:0,
			startY:0,
			marginLeft:0,
			marginTop:0,
			maxWidth:0,
			maxHeight:0,
    }
	},
	props:{
	},
	created: function(){
		var ipcRenderer = require('electron').ipcRenderer;
		ipcRenderer.on('Save', () => {
			this.Save();
		});
		ipcRenderer.on('tweet', (event, tweet, uiOption, configPath) => {
			this.Clear();
			this.tweet=tweet;
			this.uiOption=uiOption;
			if(configPath){
				this.path=configPath.path
			}
			else{
				this.path=app.getPath('userData')
			}
			if(this.Video.type!='photo'){
				this.$nextTick(()=>{
					this.PlayVideo();
				})
			}
		});
		ipcRenderer.on('SaveAll', () => {
			this.SaveAll();
		});
		ipcRenderer.on('Focus', (event)=>{
			this.$nextTick(()=>{
				this.$refs.imgModal.focus();
			});
		});
		ipcRenderer.on('keydown', (event, key)=>{
			this.KeyDown(key);
		});
    ipcRenderer.on('hide', ()=>{
			this.Clear();
    });
		this.EventBus.$on('Save', (id)=>{//id: 트윗 id
			if(id!=this.tweet.orgTweet.id_str) return;
			this.Save();
		});
		this.EventBus.$on('SaveAll', (id)=>{
			if(id!=this.tweet.orgTweet.id_str) return;
			this.SaveAll();
		});
		
	},
  mounted:function(){
	},
	mounted(){
	},
	methods:{
		MouseWheel(e){
			if(!this.ZoomAble) return;
			if(e.deltaY<0){//up, zoom
				this.Zoom();
			}
			else{//down, zoom out
				this.ZoomOut();
			}
		},
		Zoom(){
			if(!this.ZoomAble) return;
			this.isZoom=true;
			var div = this.$refs.imgDiv[this.index];
			var img = this.$refs.img[this.index];
			var percent=1.0;
			if(img.clientHeight<=img.naturalHeight){//확대 비율을 구하기
				percent=img.clientHeight/img.naturalHeight;
			}
			else if(img.clientWidth <= img.naturalWidth){
				percent=img.clientWidth/img.naturalWidth;
			}
			percent=(percent+0.1).toFixed(1);
			if(percent<0.1) percent=0.1;
			else if(percent>1.0) percent=1.0;

			this.SetImageSize(percent);
		},
		ZoomOut(){
			if(!this.ZoomAble) return;
			this.isZoom=true;
			var div = this.$refs.imgDiv[this.index];
			var img = this.$refs.img[this.index];
			var percent=1.0;
			if(img.clientHeight<=img.naturalHeight){//확대 비율을 구하기
				percent=img.clientHeight/img.naturalHeight;
			}
			else if(img.clientWidth <= img.naturalWidth){
				percent=img.clientWidth/img.naturalWidth;
			}
			percent=(percent-0.1).toFixed(1);
			if(percent<0.1) percent=0.1;
			else if(percent>1.0) percent=1.0;

			this.SetImageSize(percent);
		},
		SetImageSize(percent){//percent: 0.0~1.0 단위!
			var img = this.$refs.img[this.index];
			this.maxWidth=img.naturalWidth * percent;
			this.maxHeight=img.naturalHeight * percent;
		},
		ZoomChange(){
			if(this.isZoom){
				this.SetImageSize(1.0)
			}
			else{
				this.maxWidth=0;
				this.maxHeight=0;
			}
		},
		PlayVideo(){
			console.log('play video')
			if(this.Video.video_info.variants[0].content_type!='application/x-mpegURL'){
				console.log('not application/x-mpegURL')
				return;
			}
			var video = this.$refs.video;
			if(Hls.isSupported()){
				console.log('suported')
				var hls = new Hls();
				hls.loadSource(this.Video.video_info.variants[0].url);
				hls.attachMedia(video);
				hls.on(Hls.Events.MANIFEST_PARSED, function() {
					console.log('MANIFEST_PARSED')
					video.play();
				});
			}
			else if (video.canPlayType('application/vnd.apple.mpegurl')) {
				console.log('not suported')
				video.src = this.Video.video_info.variants[0].url;
				video.addEventListener('loadedmetadata', function() {
					console.log('loadedmetadata')
					video.play();
				});
			}
			// this.Video.video_info.variants[0].content_type
		},
		Clear(){
			for(var i=0;i<this.listProgressPercent.length;i++){
				this.listProgressPercent[i]=0;
			}
			if(this.$refs.progress!=undefined){
				this.$refs.progress.forEach((pro)=>{
					pro.SetValue(0);
				})
			}
			this.tweet=undefined;
			this.index=0;
			this.isZoom=false;
			this.isDrag=false;
			var videoElement = this.$refs.video;
			this.prevX=0;
			this.prevY=0;
			this.startX=0;
			this.startY=0;
			this.marginLeft=0;
			this.marginTop=0;
			this.maxWidth=0;
			this.maxHeight=0;
			if(videoElement){
				videoElement.pause();
	      videoElement.removeAttribute('src');
			}
		},
 		Save(){
			this.DownloadImage(this.tweet.orgTweet.extended_entities.media[this.index], this.$refs.progress[this.index]);
    },
    SaveAll(){
			for(var i=0;i<this.tweet.orgTweet.extended_entities.media.length;i++)
				this.DownloadImage(this.tweet.orgTweet.extended_entities.media[i], this.$refs.progress[i]);
		},
		DownloadImage(media, progress){
			//progress show, hide 해야 함
			var vthis=this;
			var http = require('http');
			var url = media.media_url+':orig';
			var fs = require('fs');
			var fileName = media.media_url.substring(media.media_url.lastIndexOf('/'),9999999999);
			var file = fs.createWriteStream(this.path+'/Dalsae/Image/'+fileName);

			const request = http.get(url).on('response', function(res) {
      const len = parseInt(res.headers['content-length'], 10)
      let downloaded = 0
			let percent = 0
      res
        .on('data', function(chunk) {
          file.write(chunk)
          downloaded += chunk.length
					percent = (100.0 * downloaded / len).toFixed(2)
					progress.SetValue(percent);
        })
        .on('end', function() {
					file.end()
					console.log('down ok~')
        })
        .on('error', function (err) {
					console.log('img down error!!!')
					console.log(err)
        })
    	})
		},
		Prev(){
			this.isZoom=false;
			this.index--;
			this.maxWidth=0;
			this.maxHeight=0;
			if(this.index<0)
				this.index=0;
		},
		Next(){
			this.isZoom=false;
			this.index++;
			this.maxWidth=0;
			this.maxHeight=0;
			if(this.index >= this.tweet.orgTweet.extended_entities.media.length)
				this.index--;
		},
		ImgPath(org){
			if(this.uiOption.isLoadOrgImg){
				return org+':orig';
			}
			else{
				return org;
			}
		},
		MouseDown(e){
			e.preventDefault()
			if(e.button==2 || e.button==3){//우클릭
				this.$refs.context.Show(e);
			}
			if(e.button==0){//왼클릭
				if(this.isZoom){
					this.isDrag=true;
				}
				this.prevX=e.pageX;
				this.prevY=e.pageY;
				this.startX=e.pageX;
				this.startY=e.pageY;
			}
		},
		MouseLeave(e){
			this.isDrag=false;
		},
		MouseUp(e){
			if(e.pageX == this.startX && e.pageY == this.startY){//클릭일 경우 확대 변경
				if(this.ZoomAble){
					this.isZoom=!this.isZoom;
					this.ZoomChange();
					this.marginLeft=0;//margin도 초기화 
					this.marginTop=0;
				}
			}
			this.isDrag = false;
		},
		MouseMove(e){
			if(this.isDrag){
				var y = e.pageY-this.prevY;
				var x = e.pageX-this.prevX;
				this.prevX=e.pageX;
				this.prevY=e.pageY;
				this.marginLeft+=x;
				this.marginTop+=y;
				// if(this.marginLeft<0)
				// 	this.marginLeft=0;
				// if(this.marginTop<0);
				// 	this.marginTop=0;
			}
		},
		KeyDownEsc(e){
			// close();
		},
		KeyDownSpace(e){
			if(this.ZoomAble){
				this.isZoom=!this.isZoom;
				this.ZoomChange();
				this.marginLeft=0;//margin도 초기화 
				this.marginTop=0;
			}
		},
		KeyDown(e){
			if(e.keyCode==49){
				this.isZoom=false;
				if(this.tweet.orgTweet.extended_entities.media.length>0){
					this.ChangeImage(0);
				}
			}
			else if(e.keyCode==50){
				this.isZoom=false;
				if(this.tweet.orgTweet.extended_entities.media.length>1){
					this.ChangeImage(1);
				}
			}
			else if(e.keyCode==51){
				this.isZoom=false;
				if(this.tweet.orgTweet.extended_entities.media.length>2){
					this.ChangeImage(2);
				}
			}
			else if(e.keyCode==52){
				this.isZoom=false;
				if(this.tweet.orgTweet.extended_entities.media.length>3){
					this.ChangeImage(3);
				}
			}
			else if(e.key.toUpperCase()=='E'){
				this.Zoom();
			}
			else if(e.key.toUpperCase()=='Q'){
				this.ZoomOut();
			}
			else if(e.key.toUpperCase()=='W'){
				this.marginTop+=20;
			}
			else if(e.key.toUpperCase()=='A'){
				this.marginLeft+=20;
			}
			else if(e.key.toUpperCase()=='S'){
				this.marginTop-=20;
			}
			else if(e.key.toUpperCase()=='D'){
				this.marginLeft-=20;
			}
		},
		ChangeImage(index){
			this.isZoom=false;
			this.index=index;
			this.marginLeft=0;
			this.marginTop=0;
			this.maxWidth=0;
			this.maxHeight=0;
		},
		CloseClick(e){
			this.EventBus.$emit('HideTweetImage');
		},
		SetTweet(tweet){
			console.log(JSON.stringify(tweet))
			this.tweet=tweet;
		},
	}
}
</script>
<style lang="scss" scoped>
.image-modal{
	z-index: 999;
	position: fixed;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	overflow: none;
  display: flex;
  flex-direction: row;
	background-color: rgba(0, 0, 0, 0.7);
}
.img-bg{
  width: 100%;
  height: 100%;
	background-color: rgba(0, 0, 0, 0.7);
	// overflow: auto;
}
.tweet{
	border-radius: 10px;
  max-height: 15vh;
  overflow: hidden;
}
.image-content{
	// height: 100%;
	border-radius: 10px;
	overflow-y: scroll;
	overflow-x: scroll;
	overflow: hidden;
	margin:auto;
	.img-div{
		height: calc(85vh - 140px);
		display:flex;
		justify-content: center;
		align-items: center;
		.img-content{
			display: block;
			object-fit: scale-down;
			margin: auto;
			max-width: 100%;
			max-height: 100%;
			height: auto;
			cursor: pointer;
			// vertical-align: middle;
			.zoom{
				object-fit: cover;
				// max-width: none !important;
				// max-height: none !important;
			}
		}
	}
}
video{
  width: 100%;
  height: 100%;
  max-height: 85vh;
}
.video{
  display: flex;
  justify-content: center;
}
.img-content.zoom{
	object-fit: cover;
	// max-width: none !important;
	// max-height: none !important;
}
.d-block{
	vertical-align: middle;
	margin: auto !important;
}
.carousel-inner{
	height: 100%;
	border-radius: 10px;
	overflow-y: scroll;
	overflow-x: scroll;
}
.carousel-item {
	height: calc(100vh - 300px);
}
.fas:hover{
	cursor: pointer;
}
.bottom{
	height: 120px;
	width: 100%;
	display: flex;
	position: fixed;
	bottom: 10px;
	.img-preview{
		display: inline-block;
		flex-direction: column;
		width: 25%;
		// height: 25%;
		width: 100px;
		height: 100px;
		max-height: 100px;
		max-width: 25%;
		.bottom-preview{
			width: 100px;
			height: 100px;
			object-fit: cover;
			border-radius: 12px;
		}
		.bottom-preview:hover{
			cursor: pointer;
		}
		progress{
			width: 100px;
		}
	}
}
.right-button{
	position:absolute;
	right:20px;
	top:50%;
	color:white;
}
.left-button{
	position:absolute;
	left:20px;
	top:50%;
	color:white;
}
</style>
