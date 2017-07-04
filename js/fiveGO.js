//全局变量
var pen = null;
var offset = 0;
var x = 0;
var y = 0;
var flag = 1 //1为黑子，2为白子，-1为空
var data=[];
var wait = false;//true表示等待中，false表示到你落子
function gameInit(id,status){
	if(!id){
		$("body").append("<canvas id='canvas' width='740px' height='740px'></canvas>");
	}else{
		$("#"+id).append("<canvas id='canvas' width='740px' height='740px'></canvas>");
	}
	
	//棋盘数组
	for(var i = 0 ;i < 17;i++){
		var temp = [];
		for(var j = 0;j < 17;j++){
			temp.push(-1);
		}
		data.push(temp);
	}
	
	//开始下棋
	if(status==1){//先手执黑
		flag = 1;
		wait = false;
		initChating({
			name:"系统提示",
			msg:"系统分配，先手执黑"
		},true);
	}else{
		flag = 2;
		wait = true;
		initChating({
			name:"系统提示",
			msg:"系统分配，后手执白"
		},true);
	}
	
	//初始化函数
	parallel();
	vertical();
	points();
	drawBorder()
	drawChest();
}
//画边框
function drawBorder(){
	pen = $("#canvas").get(0).getContext("2d");	
	pen.lineWidth = 2;
	pen.beginPath();
	pen.moveTo(50,50);
	pen.lineTo(690,50);
	pen.lineTo(690,690);
	pen.lineTo(50,690);
	pen.lineTo(50,50);
	pen.closePath();
	pen.stroke();
}
//画横线
function parallel(){
	pen = $("#canvas").get(0).getContext("2d");	
	pen.strokeStyle = "#000000";
	for(var i = 1;i<=15;i++){
		if(i==3||i==13||i==0||i==16){
			pen.lineWidth = 2;
		}else{
			pen.lineWidth = 1;
		}
		pen.beginPath();
		pen.moveTo(50,i*40+50);
		pen.lineTo(690,i*40+50);
		pen.stroke();
		pen.closePath();
	}
}
	
//画竖线
function vertical(){
	pen = $("#canvas").get(0).getContext("2d");	
	for(var i = 1;i<=15;i++){
		if(i==3||i==13||i==0||i==16){
			pen.lineWidth = 2;
		}else{
			pen.lineWidth = 1;
		}
		pen.beginPath();
		pen.moveTo(i*40+50,50);
		pen.lineTo(i*40+50,690);
		pen.stroke();
		pen.closePath();
	}
}
//画星
function points(){
	var r = 4;
	pen = $("#canvas").get(0).getContext("2d");	
	pen.beginPath();
	pen.arc(370,370,r,0,2*Math.PI,true);
	pen.fill();
	pen.closePath();
	pen.beginPath();
	pen.arc(170,170,r,0,2*Math.PI,true);
	pen.fill();
	pen.closePath();
	pen.beginPath();
	pen.arc(570,170,r,0,2*Math.PI,true);
	pen.fill();
	pen.closePath();
	pen.beginPath();
	pen.arc(170,570,r,0,2*Math.PI,true);
	pen.fill();
	pen.closePath();
	pen.beginPath();
	pen.arc(570,570,r,0,2*Math.PI,true);
	pen.fill();
	pen.closePath();
}

//绘制棋子
function drawChest(){
	pen = $("#canvas").get(0).getContext("2d");	
	offset = $("#canvas").offset();
	//落子
	$("#canvas").mousedown(function(event){
		if(wait){
			return;
		}
		x = Math.round((event.clientX - offset.left - 50)/40);
		y = Math.round((event.clientY - offset.top - 50)/40);
		console.log(x+","+y);
		//判断棋盘是否无子
		if(data[x][y]==-1){
			data[x][y] = flag;
			pen.beginPath();
			if(flag==1){
				//棋子高光渐变
				var black = pen.createRadialGradient(x*40+48,y*40+48,10,x*40+48,y*40+48,0)
				black.addColorStop(0, "#0A0A0A");
				black.addColorStop(1, "#636363");
				pen.fillStyle = black;
				//flag=2;
			}else{
				var white = pen.createRadialGradient(x*40+48,y*40+48,10,x*40+48,y*40+48,0)
				white.addColorStop(0, "#F1F1F1");
				white.addColorStop(1, "#FEFEFE");
				pen.fillStyle = white;
				//flag=1;
			}
			//判断是否在棋盘外
			if(x>=0&&x<=16&&y>=0&&y<=16){
				pen.arc(x*40+50,y*40+50,16,0,2*Math.PI,true);
				pen.fill();
				pen.closePath();
				//交换信息
				socket.emit("game.changeData",{
					x:x,
					y:y,
					flag:flag
				});
				wait = !wait;
				if(gameWin(x,y,flag)){
					socket.emit("game.over");
				}
			}else{
				return;
			}
		}else{
			return;
		}
	});
}
//
function drawdata(x,y,flag){
	data[x][y] = flag;
	pen.beginPath();
	if(flag==1){
		//棋子高光渐变
		var black = pen.createRadialGradient(x*40+48,y*40+48,10,x*40+48,y*40+48,0)
		black.addColorStop(0, "#0A0A0A");
		black.addColorStop(1, "#636363");
		pen.fillStyle = black;
	}else{
		var white = pen.createRadialGradient(x*40+48,y*40+48,10,x*40+48,y*40+48,0)
		white.addColorStop(0, "#F1F1F1");
		white.addColorStop(1, "#FEFEFE");
		pen.fillStyle = white;
	}
	pen.arc(x*40+50,y*40+50,16,0,2*Math.PI,true);
	pen.fill();
	pen.closePath();
}
//判断胜利
function gameWin(x,y,flag){
	var user = flag == 1?"黑子":"白子";
	//上下找
	var count = 1;
	for(var i = x-1;i>=0;i--){
		if(data[i][y] == flag){
			count++;
		}else{
			break;
		}
	}
	for(var i = x+1;i<=16;i++){
		if(data[i][y] == flag){
			count++;
		}else{
			break;
		}
	}
	if(count>=5){
		return true;
	}
	//左右找
	var count = 1;
	for(var i = y-1;i>=0;i--){
		if(data[x][i] == flag){
			count++;
		}else{
			break;
		}
	}
	for(var i = y+1;i<=16;i++){
		if(data[x][i] == flag){
			count++;
		}else{
			break;
		}
	}
	if(count>=5){
		return true;
	}
	//左上右下
	var count = 1;
	for(var i=x-1,j=y-1;i>=0&&y>=0;i--,j--){
		if(data[i][j] == flag){
			count++;
		}else{
			break;
		}
	}
	for(var i=x+1,j=y+1;i<=16&&y<=16;i++,j++){
		if(data[i][j] == flag){
			count++;
		}else{
			break;
		}
	}
	if(count>=5){
		return true;
	}
	//右上左下
	var count = 1;
	for(var i=x+1,j=y-1;i<=16&&y>=0;i++,j--){
		if(data[i][j] == flag){
			count++;
		}else{
			break;
		}
	}
	for(var i=x-1,j=y+1;i>=0&&y<=16;i--,j++){
		if(data[i][j] == flag){
			count++;
		}else{
			break;
		}
	}
	if(count>=5){
		return true;
	}
	return false;

}
















