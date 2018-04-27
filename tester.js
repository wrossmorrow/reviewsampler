
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

// this is if we want to use strict CORS dugin the survey
const corsOptions = {
    origin: "https://stanforduniversity.qualtrics.com" ,
    optionsSuccessStatus: 200
};

/*
var sheets = google.sheets({
    version : 'v4' ,
    auth : 'AIzaSyAG7fd4bVeVArLG5c6m7uY3r8gG4pZ7yto'
});

var request = {
    spreadsheetId : "1auTCGLVfoCad0qjFZy9VKvWrMGv5cwMo0ITp3efgJMY" ,
    range : 'Sheet1!A2:D6' 
};
*/

const sampleReview_u = function() { 
    var R = 0 , maxS = -1.0 , tmp = 0.0;
    counts.forEach( (c,i) => {
        tmp = Math.random();
        if( tmp > maxS ) { maxS = tmp; R = i; }
    } );
}

const sampleReview_b = function() { 
    var R = 0 , maxS = -1.0 , tmp = 0.0;
    counts.forEach( (c,i) => {
        tmp = Math.random() * ( 1.0 - Math.min( 1.0 , c/maxResponsesPerReview ) );
        if( tmp > maxS ) { maxS = tmp; R = i; }
    } );
}

const sampleReview_e = function() { 
    var R = 0 , maxS = -1.0 , tmp = 0.0;
    counts.forEach( (c,i) => {
        tmp = Math.exp( - Math.random() * c );
        if( tmp > maxS ) { maxS = tmp; R = i; }
    } );
}

const sampleReview_r = function() { 
    var R = 0 , maxS = -1.0 , tmp = 0.0;
    counts.forEach( (c,i) => {
        tmp = Math.random() / c;
        if( tmp > maxS ) { maxS = tmp; R = i; }
    } );
}

var sheets = undefined , 
    reviews = [] , 
    counts = [] , 
    maxResponsesPerReview = 5 , 
    strategy = 'b' , 
    sampleReview = sampleReview_b;

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
    console.log( "/ request" );
    res.send("API server to return balanced-uniformly sampled reviews. "); 
} );

// load google sheets app using an API key passed in the request body (data)
app.post( '/sheets/init' , ( req , res ) => {
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

    sheets.spreadsheets.values.get( req.body , ( err , response ) => {

        // respond to caller based on status
        if( err ) { 
            console.log( err ); 
            res.status(500).write(JSON.stringify(err)).send(); 
            return;
        } else { res.send(); }

        // actually load reviews and set counts vector
        reviews = Object.assign( [] , response.data.values );
        counts = new Array( reviews.length );
        for( var i = 0 ; i < reviews.length ; i++ ) { counts[i] = 0.0; }

    });

    // don't respond to the caller without loading sheet... which is an async call

}); 

// set the sampling strategy
app.post( '/strategy/:s' , ( req , res ) => {
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
    switch( req.params.s ) { 
        case 'u' : res.write( "Set to sample uniformly randomly." ).send();
        case 'b' : res.write( "Set to sample balanced-uniformly, up to a count of " + maxResponsesPerReview + " views." ).send();
        case 'e' : res.write( "Set to sample exponentially randomly, away from large counts." ).send();
        case 'r' : res.write( "Set to sample reciprocally randomly, away from large counts." ).send();
            res.send();
            break;
        default : 
            res.write( "Strategy code " + req.params.s + " not understood. Please use one of 'b', 'u', 'e', 'r'." )
            res.send();
            break;
    }
});

// simple tester; return a uniform random sample (doesn't require reviews loaded)
app.get( '/get/sample' , ( req , res ) => ( res.json( [ Math.random() ] ) ) ); 

// get an actual review (requires reviews loaded)
app.get( '/get/review' , (req,res) => {
    var R = sampleReview();
    res.json( { Product : reviews[R][1] , Rating : reviews[R][2] , Review : reviews[R][3] , RowId : R } );
    counts[R]++;
});

// get the vector of counts (debugging, basically)
app.get( '/counts' , (req,res) => { res.json(counts); } );

// reset the counts vector, in case we need to run multiple trials (for testing or otherwise)
// over the same set of reviews. Same effect as reloading the set of reviews. 
app.post( '/counts/reset' , (req,res) => { 
    for( var i = 0 ; i < reviews.length ; i++ ) { counts[i] = 0.0; }
    res.send(); 
} );

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * OLD ROUTES...
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

app.post( '/sample/0' , ( req , res ) => {

    console.log( ( new Date( Date.now() ) ).toISOString() + ": Server received a SAMPLE(0) request." );

    var size = parseInt( req.body.size ) ,
	trials = parseInt( req.body.trials )

    var questions = new Array( size ) , frequency = new Array( size );
    for( i = 0 ; i < size ; i++ ) {
	questions[i] = i;
	frequency[i] = new Array( size );
	frequency[i].fill( 0.0 );
    }

    // var rng = new _rng('Example');

    for( t = 0 ; t < trials ; t++ ) {
	var r = Object.assign( [] , questions );
	r.sort( () => ( .5 - Math.random() ) );
	// r.sort( () => ( .5 - rng.uniform() ) );
	// r = shuffle( r );
	for( i = 0 ; i < size ; i++ ) {
	    frequency[i][ r[i] ] += 1
	}
    }

    for( i = 0 ; i < size ; i++ ) {
	for( j = 0 ; j < size ; j++ ) {
	    frequency[i][j] /= parseFloat( trials );
	}
    }

    res.json( frequency );
});


app.post( '/sample/1' , ( req , res ) => {
    console.log( ( new Date( Date.now() ) ).toISOString() + ": Server received a SAMPLE(1) request." );
    var R = -1;
    if( 'max' in req.body ) {
	R = sample1_real( req.body.counts , M=req.body.max );
    } else {
	R = sample1_real( req.body.counts );
    }
    res.json( { index : R[0] } );
});

app.post( '/sample/2' , ( req , res ) => {
    console.log( ( new Date( Date.now() ) ).toISOString() + ": Server received a SAMPLE(2) request." );
    var R = -1;
    if( 'max' in req.body ) {
	R = sample2( req.body.counts , M=req.body.max );
    } else {
	R = sample2( req.body.counts );
    }
    res.json( { index : R[0] } );
});

app.post( '/sample/3' , ( req , res ) => {
    console.log( ( new Date( Date.now() ) ).toISOString() + ": Server received a SAMPLE(3) request." );
    var R = -1;
    if( 'max' in req.body ) {
	R = sample3( req.body.counts , M=req.body.max );
    } else {
	R = sample3( req.body.counts );
    }
    res.json( { index : R[0] } );
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * ACTUAL CODES FOR SAMPLING (THAT COULD BE EMBEDDED IN QUALTRICS)
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// If we need a shuffle routine... here's a simple example.
//
// https://bost.ocks.org/mike/shuffle/
//
// If you do this with arrays of objects, you need to use Object.assign( {} , x[.] )
// to force deep copies instead of reference swapping.
const shuffle = ( x ) => {
    var m = x.length, t, i;
    while ( m ) { // Pick a remaining element, and swap it with the current element.
    i = Math.floor( Math.random() * m-- );
    t = x[m]; x[m] = x[i]; x[i] = t;
    }
    return x;
}

const sample1 = ( c , M=5 ) => {
    var R = 0 , maxS = -1.0 , m = parseFloat(M) , tmp = 0.0;
    c.forEach( (c_r,r) => {
	tmp = Math.random() * ( 1.0 - Math.min( 1.0 , c_r/m ) );
	if( tmp > maxS ) { maxS = tmp; R = r; }
    } );
    return R;
};

const sample1_real = ( c , M=5 ) => {
    var R = 0 , I = -1 , maxS = -1.0 , m = parseFloat(M) , tmp = 0.0;
    c.forEach( (c_r,r) => { // these c_r's are themselves arrays... c = [ [ count , unique_id ] , ... ]
	tmp = Math.random() * ( 1.0 - Math.min( 1.0 , c_r[0]/m ) );
	if( tmp > maxS ) { maxS = tmp; R = r; I = c_r[1]; }
    } );
    return [R,I];
};

const sample2 = ( c , M=5 ) => {
    var R = 0 , maxS = -1.0 , m = parseFloat(M) , tmp = 0.0 ;
    c.forEach( (c_r,r) => {
	tmp = Math.exp( - Math.random() * c_r );
	if( tmp > maxS ) { maxS = tmp; R = r; }
    } );
    return R;
};

const sample3 = ( c , M=5 ) => {
    var R = 0 , maxS = -1.0 , m = parseFloat(M) , tmp = 0.0 ;
    c.forEach( (c_r,r) => {
	tmp = Math.random() / c_r;
	if( tmp > maxS ) { maxS = tmp; R = r; }
    } );
    return R;
};

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
console.log( "listening on port " + app.get('port') );

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * 
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
