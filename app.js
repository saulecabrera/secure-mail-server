var express = require('express');
var path = require('path');
var http = require('http');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var session = require('express-session');
var params = require('express-params');
var MongooseSession = require('mongoose-session')(mongoose);
var debug = require('debug')('secure-mail-server');
var _ = require ('underscore');

var routes = require('./routes/index');
var users = require('./routes/users');
var expressLayouts = require('express-ejs-layouts');
var passportSocketIo = require('passport.socketio');

var nodemailer = require('nodemailer');
var MailObject = require('./models/mail_object');

var app = express();
params.extend(app);

var server = require('http').Server(app);
var io = require('socket.io')(server);

// view engine setup
app.set('view engine', 'ejs');
app.set('layout', 'main_layout');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);

mongoose.connect('mongodb://localhost/secure-mail-server-v2');
app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());

app.use(session({
    key: 'express.sid',
    secret: 'valbikcipauuaxfstyltxumlehtlljqtwpcgfulqelzhvdulpn',
    resave: true,
    saveUninitialized: true,
    store: MongooseSession
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/u', users);

io.use(passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: 'valbikcipauuaxfstyltxumlehtlljqtwpcgfulqelzhvdulpn',
    store: MongooseSession,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
}));

function onAuthorizeSuccess(data, accept) {
    accept();
}

function onAuthorizeFail(data, message, error, accept) {
    if (error)
        accept(new Error(message));
}

//socket handling
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'scabrera92@unitec.edu',
        pass: 'Tilica1984'
    }
});

var onlineUsers = 0;
var liveConnections = new Array();
io.on('connection', function(socket) {

    onlineUsers++;
    if(_.find(liveConnections, function(conn){ return conn.sessionId == socket.client.request.sessionID; }) === undefined){
      liveConnections.push({
        userName: socket.request.user.name,
        userEmailAddress: socket.request.user.emailAddress,
        sessionId: socket.client.request.sessionID
      }); 
      console.log(liveConnections);
    }
    /*
        encrypt
        send
    */

    io.sockets.emit('login', JSON.stringify({liveConnections: liveConnections, onlineUsersCount: onlineUsers}));

    socket.on('disconnect', function(){
      onlineUsers--;
      var found = _.find(liveConnections, function(conn){
        return conn.userEmailAddress == socket.request.user.emailAddress;
      });
     
      var index = liveConnections.indexOf(found)
      liveConnections.splice(index, 1);
      io.sockets.emit('logout', JSON.stringify({liveConnections: liveConnections, onlineUsersCount: onlineUsers}));
    });

    socket.on('new email', function(email) {
            /*
                decryption
                db insert and associated relations
                send email to third parties
                encrypt
                send
            */

        var parsedEmail = JSON.parse(email);
        for (var i = 0; i < parsedEmail.receivers.length; i++) {
            var mailObject = new MailObject();
            mailObject.subject = parsedEmail.subject;
            mailObject.sender = socket.request.user._id;
            mailObject.receiver = parsedEmail.receivers[i];
            mailObject.body = parsedEmail.body;

            if (mailObject.receiver.split('@')[1] != 'sms.com') {
                var mailOptions = {
                    from: 'Saúl Cabrera ✔ <scabrera92@unitec.edu>',
                    to: mailObject.receiver,
                    subject: mailObject.subject,
                    text: mailObject.body
                }
                transporter.sendMail(mailOptions, function(error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Message sent ' + info.response);
                    }
                });
            }

            mailObject.save(function(err) {
                if (err) {
                    throw err;
                }
            });
        }
    });

});

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.set('port', process.env.PORT || 3000);

server.listen(app.get('port'), function() {
    debug('Express server listening on port ' + app.get('port'));
});

module.exports = app;