const express = require("express");
const app = express();
const path = require("path");
const request = require('request');
const bodyParser = require('body-parser');
const Datastore = require('nedb');

let db = new Datastore({filename: 'nodes.db', autoload: true});

const port = 3000;

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get("/test", function (req, res) {
    console.log(req);
});

app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname + "/index.html"));
});

app.get("/api/v1/nodes", function (req, res) {
    db.find({}, function (err, docs) {
        res.send(docs);
    })
});

app.post("/api/v1/nodes", function (req, res) {
    let data = req.body;

    for (let node of data) {
        db.update({name: node.instance}, {$set: {pos: node.pos}})
    }
    db.loadDatabase();
    res.send();
});

function queryProm() {
    request('http://172.16.45.19:9090/api/v1/query?query=up', {json: true}, (err, res, body) => {
            let data = body.data.result;


            for (let i = 0; i < data.length; i++) {
                let instance = data[i].metric.instance;
                let status = data[i].value[1];

                db.findOne({name: instance}, (err, result) => {
                    if (result === null) {
                        console.log("Inserting: " + instance);
                        db.insert({
                            name: instance,
                            status: status,
                            pos: {
                                x: null,
                                y: null
                            }
                        })
                    }
                });
                db.update({name: instance}, {$set: {status: status}});
            }
            db.loadDatabase();
        }
    );
}

setInterval(queryProm, 1000);

app.listen(3000);