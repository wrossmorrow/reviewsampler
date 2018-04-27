Qualtrics.SurveyEngine.addOnload( function()
{
	// get place to store custom HTML for reviews...
	var container = this.getQuestionTextContainer();
	// call review sampler API's main routine
	fetch( "https://my.server.com/reviewsampler/api/get/review" )
		.then( data => {
			// process data recieved as JSON data
			data.json()
				.then( json => {
					// Replace question's text container with a custom format of the response 
					container.innerHTML = "<ins>Question 1</ins><br><ul><li/><b>Product:</b> " + json.Product + " <br><li/><b>Rating:</b> " + json.Rating + "/5 stars <br><li/><b>Review:</b> " + json.Review + "</ul>";
					// store the Review ID embedded data so we have it later for response analysis
					Qualtrics.SurveyEngine.setEmbeddedData('R1',json.ReviewId);
				} )
			} , error => {
				// Dump error, if we can, to the server. Otherwise we have no window into client-side errors. 
				var postOpt = { method : 'post', body : JSON.stringify( error ) };
				fetch( "https://my.server.com/reviewsampler/api/error" , postOpt );
			} );
} );