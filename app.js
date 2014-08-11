var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	mongoose = require('mongoose'),
	//nicknames = []; // Chenged nicknames array to users object.
	users = {};
	// in users, nicknames are going to be the key and sockets are going to be the values


server.listen(3000);

mongoose.connect('mongodb://localhost/chat', function(err) {
	if(err){
		console.log(err);
	}else {
		console.log('Connected to mongodb!');
	}
});

var chatSchema = mongoose.Schema({
	nick: String,
	msg: String,
	created: {type: Date, default: Date.now}
});

// to do any real functions in mongodb you need a model

// first argument is the name of the collection and the second is the schema used. 
var Chat = mongoose.model('Message', chatSchema);

// in mongodb documents are encoded in BSON

app.get('/', function(req,res){
	res.sendfile(__dirname + '/index.html');
});

//socket functionality on the server side. 

io.sockets.on('connection', function(socket){
		var query = Chat.find({});
		query.sort('+created').limit(8).exec(function(err, docs){
		if(err) throw err;
		//console.log('Sending old messages!');
		socket.emit('load old msgs', docs);
	});


	socket.on('new user', function(data, callback){
		//if(nicknames.indexOf(data) != -1){
		  if(data in users){
			callback(false);
		} else {
			callback(true);
			socket.nickname = data;
			//nicknames.push(socket.nickname);
			users[socket.nickname] = socket;
			updateNicknames(); // update all the users on the friends list. 

		}
	});

	function updateNicknames(){
		//io.sockets.emit('usernames', nicknames);
		io.sockets.emit('usernames', Object.keys(users));
	}
	
	socket.on('send message', function(data, callback){
		var msg = data.trim();
		if(msg.substr(0,3) === '/w '){

			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1){
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);
				if(name in users){
					users[name].emit('whisper', {msg: msg, nick: socket.nickname});
					console.log('Whisper!');
				} else {
					callback('Error! Enter a valid user.');
				}
			} else {
				callback('Error! Please enter a message for your whisper.');

			}

		}else {
			var newMsg = new Chat({msg: msg, nick: socket.nickname});
			newMsg.save(function(err){
				if(err) throw err;
			io.sockets.emit('new message', {msg: msg, nick: socket.nickname}); // this will send the message out to all the users. 
		//sockets.broadcast.emit('new messate', data); // this will send the message out to every one but the user who sent out the messate originally. 
	
		});
	   }
	});

		socket.on('disconnect', function(data){
				if(!socket.nickname) return;
				delete users[socket.nickname];
				//nicknames.splice(nicknames.indexOf(socket.nicknames), 1);
				updateNicknames();
				
			});
});
