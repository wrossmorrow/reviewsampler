/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 *  reviewsampler API server: single-thread server
 *
 *  Copyright 2018 William Ross Morrow
 *
 *  Licensed under a modified Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *       https://github.com/wrossmorrow/reviewsampler/LICENSE.md
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * IMPORTS
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const _express = require( 'express' );
const _bodyParser = require( 'body-parser' );
const _cors = require( 'cors' );
const _rng = require( 'rng-js' );
const _fs = require( 'fs' );
const { google } = require( 'googleapis' );

// our own samplers
const _samplers = require( "./samplers.js" ).samplers;

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * SERVER SETUP AND MIDDLEWARE
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var app = _express();

app.set( 'port' , 4050 );
app.use( _bodyParser.json() );
app.use( _bodyParser.urlencoded({ extended: false }) );

app.use( _cors() );

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * CONSTANTS AND (GLOBAL) VARIABLE DECLARATIONS
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// this is IF we want to use strict CORS during the survey
const corsOptions = {
    origin: "https://stanforduniversity.qualtrics.com" ,
    optionsSuccessStatus: 200
};

const logger = ( s ) => { console.log( ( new Date( Date.now() ).toISOString() ) + " | " + s ); }

var sheets = undefined , 
    storedSheetId = undefined , 
    logStream = undefined ,
    reviews = [] , 
    counts = [] , 
    maxResponsesPerReview = 5 , 
    strategy = 'b' , 
    sampleReview = undefined , 
    reviewRequestCount = 0 ;

// set the actual sample map
var sampleReview = _samplers[strategy].smpl;
var sampleParams = { maxCount : maxResponsesPerReview };

const openlog = () => {
    var logName = ( process.env.REVIEWSAMPLER_LOG_DIR ? process.env.REVIEWSAMPLER_LOG_DIR : "." )
                     + "/" + storedSheetId + "." + Date.now() + ".log";
    logger( "Opening log \"" + logName + "\"" );
    logStream = _fs.createWriteStream( logName , { flags : 'a' } );
};

const closelog = () => {
    if( logStream ) { logStream.end(); logStream = undefined; }
}

const cleanup = () => {
    closelog();
};

// get a request's IP address. From 
//
//      https://stackoverflow.com/questions/8107856/how-to-determine-a-users-ip-address-in-node
//
const reqIP = ( req ) => {
    return  ( req.headers 
                ? ( 'x-forwarded-for' in req.headers 
                        ? req.headers['x-forwarded-for'].split(',').pop() 
                        : undefined )
                : undefined ) || 
            ( req.connection 
                ? req.connection.remoteAddress || 
                    ( req.connection.socket
                        ? req.connection.socket.remoteAddress 
                        : undefined )
                : undefined ) || 
            ( req.socket 
                ? req.socket.remoteAddress
                : undefined );
}

// do app specific cleaning before exiting
process.on('exit', () => ( cleanup() ) );

// catch ctrl+c event and exit normally
process.on('SIGINT', () => ( cleanup() ) );

//catch uncaught exceptions, trace, then exit normally
process.on( 'uncaughtException' , () => ( cleanup() ) );

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * SERVER ROUTES
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// app.options('/', _cors(corsOptions) , ... ) for more restrictive CORS settings

// a blank request to serve as info
app.get( '/' , (req,res) => {
    logger( "GET  / request" );
    res.send("API server to return balanced-uniformly sampled reviews. "); 
} );

// load google sheets app using an API key passed in the request body (data)
app.post( '/sheets/init' , ( req , res ) => {
    logger( "POST /sheets/init request (apikey sent not logged)" );
    sheets = google.sheets( { version : 'v4' , auth : req.body.apikey } );
    res.send();
}); 

// load actual google sheet, using body as the Google sheets request spec
app.post( '/sheet/load' , ( req , res ) => {

    // for example, called with data like 
    // 
    //      req.body ~ { spreadsheetId : '...' , range : 'Sheet1!A2:D6' }
    //
    // that is, the request body (data) should contain the sheets request. 

    logger( "POST /sheet/load request for spreadsheet " + req.body.spreadsheetId + " and range " + req.body.range );

    if( !sheets ) { 
        res.write( "Cannot load a sheet before initializing Google API (POST to /sheets/init)" );
        res.status(500).send();
        return;
    }

    sheets.spreadsheets.values.get( req.body , ( err , response ) => {

        // respond to caller based on status
        if( err ) { 
            console.log( err ); 
            res.status(500).write(JSON.stringify(err)).send(); 
            return;
        } else { res.send(); }

        storedSheetId = req.body.spreadsheetId;

        closelog();
        openlog();

        // actually load reviews and set counts vector
        reviews = Object.assign( [] , response.data.values );
        counts = new Array( reviews.length );
        for( var i = 0 ; i < reviews.length ; i++ ) { counts[i] = 0.0; }

    });

    // don't respond to the caller without loading sheet... which is an async call

}); 

// set the sampling strategy
app.post( '/strategy/:s' , ( req , res ) => {

    logger( "POST /strategy request, change to " + req.params.s );

    if( req.params.s in _samplers ) { 
        logger( "Changing strategy to " + _samplers[req.params.s].name );
        strategy = req.params.s;
        sampleReview = _samplers[strategy].smpl;
        sampleParams = ( strategy == 'b' ? { maxCount : maxResponsesPerReview } : {} );
        res.send();
    } else {
        res.write( "Strategy code " + req.params.s + " not understood. Please use one of 'b', 'u', 'e', 'r'." )
        res.send( 500 );
        return;
    }

});

// get (text describing) the sampling strategy... any process can respond
app.get( '/strategy' , ( req , res ) => {
    logger( "GET  /strategy request" );
    res.write( "Strategy: " + _samplers[strategy].name + " (" + strategy + ")\n" + _samplers[strategy].help );
    res.send();
});

// get an actual review (requires reviews loaded)
app.get( '/get/review' , (req,res) => {

    if( reviews.length == 0 ) {
        res.write( "Don't appear to have a reviews object to sample from yet." )
        res.status(500).send();
        return;
    }

    reviewRequestCount += 1;

    // actually sample review...
    var R = sampleReview( counts , sampleParams );
    
    logger( "GET  /get/review request " + reviewRequestCount + " sampled review " + reviews[R][0] );

    res.json( { ReviewId : reviews[R][0] , Product : reviews[R][1] , Rating : reviews[R][2] , Review : reviews[R][3] } );

    counts[R]++;
    logStream.write( ( new Date( Date.now() ).toISOString() )
                        + "|" + reqIP( req ) 
                        + "|" + R
                        + "|" + counts[R]
                        + "|" + reviewRequestCount
                        + "\n" );

});

// get the vector of counts (debugging, basically)
app.get( '/counts' , (req,res) => { 
    logger( "GET  /counts request " );
    res.json(counts); 
} );

// reset the counts vector, in case we need to run multiple trials (for testing or otherwise)
// over the same set of reviews. Same effect as reloading the set of reviews. 
app.post( '/counts/reset' , (req,res) => { 

    closelog();
    openlog();

    logger( "POST /counts/reset request " );
    for( var i = 0 ; i < reviews.length ; i++ ) { counts[i] = 0.0; }
    res.send(); 

} );

// naive error post back method
app.post( '/error' , (req,res) => { 
    logger( "POST /error request : " + JSON.stringify( req.body ) );
    res.send(); 
} );

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * SERVER LAUNCH
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

server = app.listen( app.get('port') );
logger( "listening on port " + app.get('port') );

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * 
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
