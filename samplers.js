

const sampleReview_u = function( counts , params ) { 
    var R = 0 , maxS = -1.0 , tmp = 0.0;
    counts.forEach( (c,i) => {
        tmp = Math.random();
        if( tmp > maxS ) { maxS = tmp; R = i; }
    } );
    return R;
}

const sampleReview_b = function( counts , params ) { 
    var R = 0 , maxS = -1.0 , tmp = 0.0;
    counts.forEach( (c,i) => {
        tmp = Math.random() * ( 1.0 - Math.min( 1.0 , c/params.maxCount ) );
        if( tmp > maxS ) { maxS = tmp; R = i; }
    } );
    return R;
}

const sampleReview_e = function( counts , params ) { 
    var R = 0 , maxS = -1.0 , tmp = 0.0;
    counts.forEach( (c,i) => {
        tmp = Math.exp( - Math.random() * c );
        if( tmp > maxS ) { maxS = tmp; R = i; }
    } );
    return R;
}

const sampleReview_r = function( counts , params ) { 
    var R = 0 , maxS = -1.0 , tmp = 0.0;
    counts.forEach( (c,i) => {
        tmp = Math.random() / c;
        if( tmp > maxS ) { maxS = tmp; R = i; }
    } );
    return R;
}

// export command... 
exports.samplers = {
  'u' : { name : "uniform" , 
          smpl : sampleReview_u , 
          help : "Sample rows uniformly randomly." } , 
  'b' : { name : "balanced-uniform" , 
          smpl : sampleReview_b , 
          help : "..." } , 
  'e' : { name : "exponentially-weighted" , 
          smpl : sampleReview_e , 
          help : "Down-weight likelihood of sampling high-count rows with the inverse exponential of the row's count." } , 
  'r' : { name : "reciprocally-weighted" , 
          smpl : sampleReview_r , 
          help : "Down-weight likelihood of sampling high-count rows with the reciprocal of the row's count." }
}