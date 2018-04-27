
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * SERVER/UTILITIES SETUP FOR TESTING
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const _express = require( 'express' );
const _bodyParser = require( 'body-parser' );
const _cors = require( 'cors' );
const _rng = require( 'rng-js' );
const { google } = require( 'googleapis' );

var app = _express();

app.set( 'port' , 4050 );
// app.use( _bodyParser.json() );
// app.use( _bodyParser.urlencoded({ extended: false }) );
// from: https://stackoverflow.com/questions/36716311/node-js-error-too-many-parameters-error-while-uploading-bulk-data?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
app.use( _bodyParser.json( { limit : '50mb' } ) );
app.use( _bodyParser.urlencoded( { limit : '50mb' , extended : true , parameterLimit : 1000000 } ) );

app.use( _cors() );

const corsOptions = {
    origin: "https://stanforduniversity.qualtrics.com" ,
    optionsSuccessStatus: 200
};


const sheets = google.sheets({
    version : 'v4' ,
    auth : 'AIzaSyAG7fd4bVeVArLG5c6m7uY3r8gG4pZ7yto'
});

const request = {
    spreadsheetId : "1auTCGLVfoCad0qjFZy9VKvWrMGv5cwMo0ITp3efgJMY" ,
    range : 'Sheet1!A2:D6' 
};

var reviews = [] , counts = [];

sheets.spreadsheets.values.get( request , (err,response) => {
    if( err ) { console.log( err ); return; }
    Object.keys( response.data ).map( (k,i) => (
	console.log( k )
    ));
    reviews = Object.assign( [] , response.data.values );
    console.log( JSON.stringify( response.data.values , null , 2 ) );
    counts = new Array( reviews.length );
    resetCounts();  
});

const resetCounts = () => {
    for( var i = 0 ; i < reviews.length ; i++ ) { counts[i] = 0.0; }
}

var maxResponsesPerReview = 5;

server = app.listen( app.get('port') );

// app.options('/', _cors(corsOptions) );
app.get( '/' , (req,res) => {
    console.log( "/ request" );
    res.send("Ideally, I would do something here."); 
} );


app.get( '/review' , (req,res) => {

    var R = 0 , C = 0 , maxS = -1.0 , tmp = 0.0;
    counts.forEach( (c,i) => {
	tmp = Math.random() * ( 1.0 - Math.min( 1.0 , c/maxResponsesPerReview ) );
	if( tmp > maxS ) { maxS = tmp; R = i; C = c; }
    } );
    res.json( { Product : reviews[R][1] , Rating : reviews[R][2] , Review : reviews[R][3] } );
    counts[R]++;
    
});

app.get( '/counts' , (req,res) => { res.json(counts); } );

app.get( '/sample' , ( req , res ) => {
    res.json( [ Math.random() ] );
}); 

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

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * ACTUAL CODES FOR SAMPLING (THAT COULD BE EMBEDDED IN QUALTRICS)
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

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
 * 
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
