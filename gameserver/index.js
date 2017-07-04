//创建一个websocket服务器
var server = require('http').createServer();
var io = require('socket.io')(server);
var onlineNum = 0;//在线人数
var users = {};
var rooms = {};
//socket就是客户端与服务器的通道
io.on('connection', function(socket){
    console.log("一个用户连接到服务器");
    onlineNum ++;
    io.sockets.emit('user.change',onlineNum);
    socket.join("public");
  
  //自定义函数
  socket.on('user.online', function(user){
    user.room = 'public';//定义用户房间属性
    users[user.id] = user;//保存用户信息
    //广播用户信息
    io.sockets.emit('user.online',getUsers());
  });
  //获取房间信息
  socket.on('room.online',function(rooms){
    socket.emit("room.rooms",getRooms());
  });
  
  //接受用户聊天信息
  socket.on('chat.send',function(mess){
    var user = users[socket.id.replace("/#",'')];
    socket.to(user.room).emit("chat.new",mess);
  });
  
  //创建房间
  socket.on('room.createroom',function(roomname){
    var user = users[socket.id.replace("/#",'')];
    if(rooms[roomname]){
      socket.emit("room.exists");
      return;
    }
    rooms[roomname] = {roomname:roomname,play1:user,play2:null};
    
    //切换房间
    socket.leave(user.room);
    socket.join(roomname);
    //用户切换状态
    user.room = roomname;
    user.flag = 2;
    
    //刷新房间列表
    io.sockets.in('public').emit("room.rooms",getRooms());
    //用户刷新房间信息
    socket.emit("room.createOK",rooms[roomname]);
    //刷新所有玩家状态信息
    io.sockets.emit('user.online',getUsers());
  });
  //加入房间
  socket.on("room.join",function(roomname){
    
    if(rooms[roomname].play2){
      socket.emit("room.joinFail");
      return;
    }
    var user = users[socket.id.replace("/#",'')];
    socket.leave(user.room);
    socket.join(roomname);
    user.room = roomname;
    user.flag = 2;//切换状态
    
    rooms[roomname].play2 = user;
    //刷新自己
    socket.emit("room.joinOK",rooms[roomname]);
    //刷新对手
    socket.in(roomname).emit("room.createOK",rooms[roomname]);
    //刷新所有玩家状态信息
    io.sockets.emit('user.online',getUsers());
  });
  
  //游戏开始
  socket.on("game.on",function(){
    var user = users[socket.id.replace("/#",'')];
    var room = rooms[user.room];
    if(room.play1 && room.play2){
      //向房主发送游戏开始指令
      socket.emit("game.on",1);//1代表先手执黑
      //向玩家2发送开始指令
      socket.in(user.room).emit("game.on",2);//2代表后手执白
      
      //修改玩家状态
      room.play1.flag = 3;
      room.play2.flag = 3;
      room.play1.total += 1;
      room.play2.total += 1;
      //刷新用户状态
      io.sockets.emit('user.online',getUsers());
      //开场添加玩家游戏场次
      socket.emit('add.total',room.play1);
      socket.in(user.room).emit('add.total',room.play2);
    }
  });
  
  //数据交换指令
  socket.on("game.changeData",function(data){
    var user = users[socket.id.replace("/#",'')];
    socket.in(user.room).emit("game.changeData",data);
  });
  
  //传递信息，游戏结束
  socket.on("game.over",function(){
    var user = users[socket.id.replace("/#",'')];
    var room = rooms[user.room];
    //判断胜负方
    var winner = user.id==room.play1.id?room.play1:room.play2;
    var loser  = user.id==room.play1.id?room.play2:room.play1;
    
    //更改双方信息
    winner.flag = 2;
    winner.win += 1;
    //winner.total +=1;
    //loser.total +=1;
    loser.flag = 2;
    
    //发送结果信息
    socket.emit('game.over',winner);
    socket.in(user.room).emit('game.over',loser);
    io.sockets.in(user.room).emit('alert.new',{
      chat:winner.name+"赢了"
    });
    
    
    //刷新用户状态
    io.sockets.emit('user.online',getUsers());
    
    /*两种规则可选*/
    //规则1：刷新房间列表，并且获胜方为房主 
    //socket.in(user.room).emit("room.joinOK",room);
    //socket.emit("room.createOK",room);
    //规则2：刷新房间列表，房主不变 
    var player1 = io.sockets.sockets["/#" +room.play1.id];
    var player2 = io.sockets.sockets["/#" +room.play2.id];
    player2.emit("room.joinOK",room);
    player1.emit("room.createOK",room);
     /*两种规则可选*/
  });
  
  //退出房间
  socket.on("room.exit",function() {
    var user = users[socket.id.replace("/#",'')];
    var room = rooms[user.room];
    
    if(user.id == room.play1.id){//房主
      delete rooms[user.room];
      
      //判断是否有玩家2
      if(room.play2){
        room.play2.flag = 1;//更改玩家2状态
        room.play2.room = "public";//玩家2房间属性为public
        //找到对方的socket，并离开房间进入public
        var so = io.sockets.sockets["/#" +room.play2.id];
        so.leave(user.room);//离开当前房间
        so.join("public");//进入public
      }
    }else{//加入者
      room.play2 = null;//清空玩家2
      socket.in(user.room).emit("room.createOK",room);//刷新对手房间信息
    }
    //自己退出房间
    user.flag = 1;//更改玩家状态
    socket.leave(user.room);//离开当前游戏房间
    user.room = "public";//更改玩家房间属性为public
    socket.join("public");//进入public房间
    
    //刷新房间列表
    io.sockets.in("public").emit("room.rooms",getRooms());
    
    //刷新用户状态
    io.sockets.emit('user.online',getUsers());
  });
  
  //删除离线用户信息
  socket.on('disconnect', function(){
    var user = users[socket.id.replace("/#",'')];
    
    //判断断线玩家是否游戏中
    if(user.flag == 3){
      var room = rooms[user.room];
      if(user.id == room.play1.id){
        delete rooms[user.room];//删除用户所在房间
        room.play2.flag = 1;//更改玩家2状态
        room.play2.room = "public"; //更改玩家1房间属性
        
        //更改用户状态
        room.play2.win += 1;
        //room.play2.total += 1;
        //room.play1.total += 1;
        //找到对方的socket，并离开房间进入public
        var so = io.sockets.sockets["/#" +room.play2.id];
        so.leave(user.room);//离开当前房间
        so.join("public");//进入public  
        
       //并发送胜利消息
        so.emit("game.over",room.play2);
        
        //发送躺赢消息
        so.emit('alert.new',{
          chat:"您的对手掉线了，恭喜您躺赢一局！"
        });
        
        //刷新房间列表
        io.sockets.in("public").emit("room.rooms",getRooms());
      }else{
        room.play1.flag = 2;//玩家1处于准备状态
        
        //更改用户状态并发送胜利消息
        room.play1.win += 1;
        //room.play1.total += 1;
        //room.play2.total += 1;
        socket.in(user.room).emit("game.over",room.play1);
        
        room.play2 = null;//清空玩家2
        socket.in(user.room).emit("room.createOK",room);//刷新对手房间信息
        
        //发送躺赢消息
        socket.in(user.room).emit('alert.new',{
          chat:"您的对手掉线了，恭喜您躺赢一局！"
        });
      }
    }
    
    //判断断线玩家是否等待中
    if(user.flag == 2){
      var room = rooms[user.room];
      
      //判断是否为房主
      if(user.id == room.play1.id){
        delete rooms[user.room];//删除用户所在房间
        
        //判断房间是否有玩家2
        if(room.play2){
          room.play2.flag = 1;//更改玩家2状态
          room.play2.room = "public"; //更改玩家1房间属性
          //找到对方的socket，并离开房间进入public
          var so = io.sockets.sockets["/#" +room.play2.id];
          so.leave(user.room);//离开当前房间
          so.join("public");//进入public
        }  
        //刷新房间列表
        io.sockets.in("public").emit("room.rooms",getRooms());
       }else{
         room.play2 = null;//清空玩家2
         socket.in(user.room).emit("room.createOK",room);//刷新对手房间信息
       }
      
    }
    
    
    //删除自己并刷新在线玩家列表
    delete users[socket.id.replace("/#",'')];
    io.sockets.emit('user.online',getUsers());
    onlineNum --;
    io.sockets.emit('user.change',onlineNum);
  });
});
//刷新玩家
function getUsers(){
  var arr = [];
  for (var key in users){
    arr.push(users[key]);
  }
  return arr;
}
//刷新房间
function getRooms(){
  var arr = [];
  for (var key in rooms){
    arr.push(rooms[key]);
  }
  return arr;
}

//开服务器
server.listen(3000);
console.log("服务器开启成功！");