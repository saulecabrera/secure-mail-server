#Secure Mail Server

Secure Mail Server consisted of an academic exercise. It's a mail server that encrypts every client-server communication via MD5 and TripleDES. 

Socket.io was heavily used to manage client-server connections; to autehticate the socket and have a friendly (authenticated) user - socket interaction [passport.socketio](https://github.com/jfromaniello/passport.socketio) was used. 

I may say that this is an awesome package because to handle to which user each socket connection belongs to I just had to call inside `io.on('connection', function(socket){...})` `socket.request.user` and would have the connected user information at hand.

