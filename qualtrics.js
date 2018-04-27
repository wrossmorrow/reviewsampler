Qualtrics.SurveyEngine.addOnload( function()
{
	var container = this.getQuestionTextContainer();
	fetch( "https://my.server.com/reviewsampler/api/review" )
		.then( data => {
			// process data recieved as JSON data
			data.json()
				.then( json => ( 
					// Replace question's text container with a custom format of the response 
					container.innerHTML = "<ins>Question 1</ins><br><ul><li/><b>Product:</b> " + Product + " <br><li/><b>Rating:</b> " + Rating + "/5 stars <br><li/><b>Review:</b> " + Review + "</ul>";
				) )
			} , error => {
				// Dump error, if we can, to the server. Otherwise we have no window into client-side errors. 
				var postOpt = { method : 'post', body : JSON.stringify( error ) };
				fetch( "https://my.server.com/reviewsampler/api/error" , postOpt );
			} );
} );