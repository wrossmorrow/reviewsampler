/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 *  reviewsampler API server: sampler methods
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

const sampleReview_u = function() { 
    var R = 0 , maxS = -1.0 , tmp = 0.0;
    counts.forEach( (c,i) => {
        tmp = Math.random();
        if( tmp > maxS ) { maxS = tmp; R = i; }
    } );
    return R;
}

var maxCount = 0;
const sampleReview_b = function() { 
    var R = 0 , maxS = -1.0 , tmp = 0.0 , localMax = Math.max( maxCount , maxResponsesPerReview );
    counts.forEach( (c,i) => {
        if( c > maxCount ) { maxCount = c; }
        tmp = Math.random() * ( 1.0 - Math.min( 1.0 , c/localMax ) );
        if( tmp > maxS ) { maxS = tmp; R = i; }
    } );
    return R;
}

const sampleReview_e = function() { 
    var R = 0 , maxS = -1.0 , tmp = 0.0;
    counts.forEach( (c,i) => {
        tmp = Math.exp( - Math.random() * c );
        if( tmp > maxS ) { maxS = tmp; R = i; }
    } );
    return R;
}

const sampleReview_r = function() { 
    var R = 0 , maxS = -1.0 , tmp = 0.0;
    counts.forEach( (c,i) => {
        tmp = Math.random() / c;
        if( tmp > maxS ) { maxS = tmp; R = i; }
    } );
    return R;
}

var sheets = undefined , 
    storedSheetId = undefined , 
    logStream = undefined ,
    reviews = [] , 
    counts = [] , 
    maxResponsesPerReview = 5 , 
    strategy = 'b' , 
    sampleReview = sampleReview_b , 
    reviewRequestCount = 0 ;

const cleanup = () => {
    if( logStream ) { logStream.end(); logStream = undefined; }
};

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

        if( logStream ) { logStream.end(); logStream = undefined; }
        logStream = _fs.createWriteStream( process.env.REVIEWSAMPLER_LOG_DIR + "/" 
                                                + storedSheetId + "." + Date.now() + ".log" , 
                                            { flags : 'a' } );

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
    switch( req.params.s ) { 
        case 'u' : strategy = req.params.s; sampleReview = sampleReview_u; break;
        case 'b' : strategy = req.params.s; sampleReview = sampleReview_b; break;
        case 'e' : strategy = req.params.s; sampleReview = sampleReview_e; break;
        case 'r' : strategy = req.params.s; sampleReview = sampleReview_r; break;
        default : 
            res.write( "Strategy code " + req.params.s + " not understood. Please use one of 'b', 'u', 'e', 'r'." )
            res.send( 500 );
            return;
    }
    res.send();
});

// get (text describing) the sampling strategy
app.get( '/strategy' , ( req , res ) => {
    logger( "GET  /strategy request" );
    switch( strategy ) { 
        case 'u' : res.write( "Set to sample uniformly randomly." ); res.send(); break;
        case 'b' : res.write( "Set to sample balanced-uniformly, up to a count of " + maxResponsesPerReview + " views." ); res.send(); break;
        case 'e' : res.write( "Set to sample exponentially randomly, away from large counts." ); res.send(); break;
        case 'r' : res.write( "Set to sample reciprocally randomly, away from large counts." ); res.send(); break;
        default : 
            res.write( "Strategy code " + req.params.s + " not understood." )
            res.send();
            break;
    }
});

// simple tester; return a uniform random sample (doesn't require reviews loaded)
app.get( '/get/sample' , ( req , res ) => {
    logger( "GET  /get/sample request" );
    res.json( [ Math.random() ] ) 
} ); 

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

// get an actual review (requires reviews loaded)
app.get( '/get/review' , (req,res) => {

    if( reviews.length == 0 ) {
        res.write( "Don't appear to have a reviews object to sample from yet." )
        res.status(500).send();
        return;
    }

    reviewRequestCount += 1;
    var R = sampleReview();
    
    logger( "GET  /get/review request " + reviewRequestCount + " sampled review " + reviews[R][0] );
    res.json( { ReviewId : reviews[R][0] , Product : reviews[R][1] , Rating : reviews[R][2] , Review : reviews[R][3] } );

    var ip = reqIP( req );

    counts[R]++;

    logger( logStream.write( ( new Date( Date.now() ).toISOString() )
                        + "|" + ip 
                        + "|" + R
                        + "|" + counts[R]
                        + "|" + reviewRequestCount
                        + "\n" ) );

});

// get the vector of counts (debugging, basically)
app.get( '/counts' , (req,res) => { 
    logger( "GET  /counts request " );
    res.json(counts); 
} );

// reset the counts vector, in case we need to run multiple trials (for testing or otherwise)
// over the same set of reviews. Same effect as reloading the set of reviews. 
app.post( '/counts/reset' , (req,res) => { 

    if( logStream ) { logStream.end(); logStream = undefined; }
    logStream = _fs.createWriteStream( process.env.REVIEWSAMPLER_LOG_DIR + "/" 
                                            + storedSheetId + "." + Date.now() + ".log" , 
                                        { flags : 'a' } );

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
