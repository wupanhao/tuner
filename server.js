var express = require('express')
var fs = require('fs')
var https = require('https')
var app = express()

app.get('/', function(req, res) {
    res.send('hello world')
})

app.use('/', express.static(__dirname + '/'))

https.createServer({
        key: fs.readFileSync(__dirname + '/cert/cert-1541262616255_wxapp0.easyfind.top.key'),
        cert: fs.readFileSync(__dirname + '/cert/cert-1541262616255_wxapp0.easyfind.top.crt')
    }, app)
    .listen(8000, function() {
        console.log('Example app listening on port 8000! Go to https://localhost:8000/')
    })