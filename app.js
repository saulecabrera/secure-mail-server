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
var _ = require('underscore');
var CryptoJS = require('crypto-js');

var routes = require('./routes/index');
var users = require('./routes/users');
var expressLayouts = require('express-ejs-layouts');
var passportSocketIo = require('passport.socketio');

var nodemailer = require('nodemailer');
var MailObject = require('./models/mail_object');
var Log = require('./models/log');


var K = 'valbikcipauuaxfstyltxumlehtlljqtwpcgfulqelzhvdulpn';
var HK = CryptoJS.MD5(K).toString();

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
    secret: K,
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
    secret: K,
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
        user: 'YOUR EMAIL',
        pass: 'YOUR PASS'
    }
});

var onlineUsers = 0;
var liveConnections = new Array();
io.on('connection', function(socket) {

    onlineUsers++;
    if (_.find(liveConnections, function(conn) {
        return conn.sessionId == socket.client.request.sessionID;
    }) === undefined) {
        liveConnections.push({
            userName: socket.request.user.name,
            userEmailAddress: socket.request.user.emailAddress,
            sessionId: socket.client.request.sessionID
        });
    }
    /*
        encrypt
        send
    */

    var log = new Log();
    log.action = socket.request.user.name + " connected";
    log.location = "Application";
    log.user = socket.request.user._id;
    log.save(function(err) {
        if (err) {
            console.log(err);
        }
        console.log("(En logs) Trama del log de salida JSON");
        var JSONString = JSON.stringify(log);
        console.log(JSONString);

        console.log("(En logs) Trama del log de salida encriptado")
        var encrypted = CryptoJS.TripleDES.encrypt(JSONString, HK).toString();
        console.log(encrypted);

        io.sockets.connected[socket.id].emit('single-log', encrypted);
    });

    //populating all logs
    var logMap = {}
    logMap.logs = [];
    Log
        .find({
            user: socket.request.user._id
        })
        .exec(function(err, l) {

            if (err) return handleError(err);
            logMap.logs = l;
            var JSONString = JSON.stringify(logMap);
            console.log("(En logs) Transferencia de todos los logs JSON");
            console.log(JSONString);
            console.log("(En logs) Transferencia de todos los logs encriptado")
            var encrypted = CryptoJS.TripleDES.encrypt(JSONString, HK).toString();
            console.log(encrypted)
            io.sockets.connected[socket.id].emit('all-logs', encrypted);
        });


    var JSONString = JSON.stringify({
        liveConnections: liveConnections,
        onlineUsersCount: onlineUsers
    });
    console.log('(En nueva conexión) Salida dela trama de las conexiones vivas JSON: ')
    console.log(JSONString);

    var des = CryptoJS.TripleDES.encrypt(JSONString, HK).toString();
    console.log('(En nueva conexión) Salida de la trama de las conexiones encriptada: ');
    console.log(des);
    io.sockets.emit('login', des);

    socket.on('disconnect', function() {
        onlineUsers--;
        var found = _.find(liveConnections, function(conn) {
            return conn.userEmailAddress == socket.request.user.emailAddress;
        });

        var index = liveConnections.indexOf(found)
        liveConnections.splice(index, 1);
        io.sockets.emit('logout', JSON.stringify({
            liveConnections: liveConnections,
            onlineUsersCount: onlineUsers
        }));

        var log = new Log();
        log.action = socket.request.user.name + " disconnected";
        log.location = "Application";
        log.user = socket.request.user._id;

        log.save(function(err) {
            if (err) {
                console.log(err);
            }
            console.log("(En logs) Trama del log de salida JSON");
            var JSONString = JSON.stringify(log);
            console.log(JSONString);

            console.log("(En logs) Trama del log de salida encriptado")
            var encrypted = CryptoJS.TripleDES.encrypt(JSONString, HK).toString();
            console.log(encrypted);

            //socket.emit('all-logs', encrypted);
        });
    });

    /* just for populating when user connects */
    var mailServer = {};
    mailServer.inbox = [];
    mailServer.outbox = [];
    MailObject
        .find().or([{
            receiver: socket.request.user.emailAddress
        }, {
            sender: socket.request.user._id
        }])
        .populate('sender')
        .exec(function(err, m) {
            if (err) return handleError(err);

            mailServer.inbox = _.filter(m, function(mx) {
                return mx.receiver == socket.request.user.emailAddress;
            });

            mailServer.outbox = _.filter(m, function(mx) {
                return mx.sender.emailAddress == socket.request.user.emailAddress;
            });

            mailServer.inbox.reverse();
            mailServer.outbox.reverse();

            var JSONString = JSON.stringify(mailServer);
            console.log("(En filtrado de correos del cliente) Salida de la trama de correos en JSON: ");
            console.log(JSONString);

            var des = CryptoJS.TripleDES.encrypt(JSONString, HK).toString();
            console.log("(En filtrado de correos del cliente) Salida de la trama de correos encriptada: ");
            console.log(des);

            io.sockets.connected[socket.id].emit('new email', des);
        });

    socket.on('new email', function(email) {
        /*
            decryption
            db insert and associated relations
            send email to third parties
            encrypt
            send
        */

        console.log("(En envío de nuevo correo) Entrada de la trama de correo encriptada: ");
        console.log(email);
        var ddes = CryptoJS.TripleDES.decrypt(email, HK).toString(CryptoJS.enc.Latin1);
        console.log("(En envío de nuevo correo) Entrada de la trama de correo JSON: ");
        console.log(ddes);

        var parsedEmail = JSON.parse(ddes);
        for (var i = 0; i < parsedEmail.receivers.length; i++) {
            var mailObject = new MailObject();
            mailObject.subject = parsedEmail.subject;
            mailObject.sender = socket.request.user._id;
            mailObject.receiver = parsedEmail.receivers[i];
            mailObject.body = parsedEmail.body;

            if (mailObject.receiver.split('@')[1] != 'sms.com') {
                var mailOptions = {
                    from: 'YOUR NAME ✔ <YOUR EMAIL>',
                    to: mailObject.receiver,
                    subject: mailObject.subject,
                    text: mailObject.body
                }
                transporter.sendMail(mailOptions, function(error, info) {
                    if (error) {
                        console.log(error);
                    }
                });
            }

            mailObject.save(function(err) {
                if (err) {
                    throw err;
                }
                mailServer = {};
                mailServer.inbox = [];
                mailServer.outbox = [];
                MailObject
                    .find().or([{
                        receiver: socket.request.user.emailAddress
                    }, {
                        sender: socket.request.user._id
                    }])
                    .populate('sender')
                    .exec(function(err, m) {
                        if (err) return handleError(err);
                        mailServer.inbox = _.filter(m, function(mx) {
                            return mx.receiver == socket.request.user.emailAddress;
                        });

                        mailServer.outbox = _.filter(m, function(mx) {
                            return mx.sender.emailAddress == socket.request.user.emailAddress;
                        });

                        mailServer.inbox.reverse();
                        mailServer.outbox.reverse();

                        var JSONString = JSON.stringify(mailServer);
                        console.log("(En filtrado de correos del cliente) Salida de la trama de correos en JSON: ");
                        console.log(JSONString);

                        var des = CryptoJS.TripleDES.encrypt(JSONString, HK).toString();
                        console.log("(En filtrado de correos del cliente) Salida de la trama de correos encriptada: ");
                        console.log(des);

                        io.sockets.connected[socket.id].emit('new email', des);
                    });
                
                var log = new Log();
                log.action = socket.request.user.name + "  sent/received email";
                log.location = "New email";
                log.user = socket.request.user._id;

                log.save(function(err) {
                    if (err) {
                        console.log(err);
                    }
                    console.log("(En logs) Trama del log de salida JSON");
                    var JSONString = JSON.stringify(log);
                    console.log(JSONString);

                    console.log("(En logs) Trama del log de salida encriptado")
                    var encrypted = CryptoJS.TripleDES.encrypt(JSONString, HK).toString();
                    console.log(encrypted);

                    io.sockets.connected[socket.id].emit('single-log', encrypted);
                });
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