var express=require("express");
var app=express();
var validator = require('validator');
var mongo = require('mongodb').MongoClient;
var mongoURL=process.env.MONGO_URI;

app.get("/", function(req,res){
    res.send(`<pre>To shorten a specific URL, please go to: 
    https://liorban-url-shortener.herokuapp.com/long/<yourURL>
    
    Once you get your short URL, you can access it in your browser and it will redirect to the original URL.
    
    Example:
    
    Step 1: https://liorban-url-shortener.herokuapp.com/long/http://www.example.com
    Now 'http://www.example.com' will be stored into our database, together with a generated short URL
    
    Step 2: Our server will respond with an object containing the original URL (http://www.example.com) and the generated short URL
    
    Step 3: Copy the short URL and access it in your browser. It should redirect to the original URL (http://www.example.com).
    </pre>`);
});

app.get("/long/*", function(req,res){
    var url=req.params[0];
    if (isValidURL(url)) {
        var obj;
        mongo.connect(mongoURL, function(err,db) {
            if (err) {return console.log(err)}
            else  {
                obj={};
                db.collection('urls').findOne({"original": url},{"_id":false,"original":true, "short":true}, function(err,doc) {
                    if (err) {return console.log(err)}
                    else if (doc){
                         res.send({"original":doc.original,"short":doc.short});
                    }
                    else {
                        db.collection('urls').count({},function(err,data){
                            if (err) {return console.log(err)}
                            else { 
                                var protocol;
                                //if (req.secure) {protocol='https';}
                                //else {protocol='http';}
                                protocol='https'; //req.secure doesn't work on heroku so I'm hardcoding the https protocol
                                var shortURL=protocol+"://"+req.get('host')+"/"+data;
                                obj={"original": url, "short": shortURL};
                                if (obj!=={}) {
                                    db.collection('urls').insert(obj, function(err,data) {
                                        if (err) {return console.log(err)}
                                        else {
                                        res.send({"original":obj.original,"short":obj.short});
                                        db.close();
                                        }
                                    }); 
                                }       
                            }
                        });
                    }
                });            
            }
        });  
    } 
    else { 
        res.send({"error":"please enter a valid and complete URL, including 'http' or 'https' protocol and 'www'"});        
    }
});

app.get("/:number",function(req,res){
    
    if (req.params.number!=='long' && req.params.number!=='') {
        mongo.connect(mongoURL,function(err,db) {
            if (err) {return err}
            else {
                var protocol;
                //if (req.secure) {protocol='https';}
                //else {protocol='http';}
                protocol='https'; //req.secure doesn't work on heroku so I'm hardcoding the https protocol 
                var shortURL=protocol+"://"+req.get('host')+"/"+req.params.number;
                db.collection('urls').findOne({"short": shortURL}, function(err,data){
                    if (err) {return err}
                    else {
                        if (data) {res.redirect(data.original);}
                        else {res.send("No such URL");}
                        db.close();
                    }
                });
                
            }
        });
    }
});

function isValidURL(url) {
    if (!validator.isURL(url,{protocols: ["http", "https"], require_protocol: true})) {return false;}
    if (!url.includes("//www.")) {return false;}
    return true;
}

app.listen(process.env.PORT || 8080);
