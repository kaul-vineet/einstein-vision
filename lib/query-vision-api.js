const rp = require('request-promise');
var Episode7 = require('episode-7');
const updateToken = require('./update-token');
const oAuthToken = require('./oauth-token');

let loopPreventor = false;

function* queryVisionApi(
                       pvsUrl,
                       resizedImgUrl,
                       modelId='GeneralImageClassifier',
                       accountId,
                       privateKey,
                       jwtToken){
  var token = jwtToken || oAuthToken.get();

  var formData = {
    modelId: modelId,
    sampleLocation : resizedImgUrl
  }

  var options = {
      url: `${pvsUrl}v1/vision/predict`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      },
      formData:formData
  }


  let { body, isUnauthorized } = yield Episode7.call((options) => {
    return rp(options)
      .then( body => ({ body }) )
      .catch( error => {
        if(error.statusCode === 401) {
          return { isUnauthorized: true };
        } else {
          throw error;
        }
      })
  },options);
  
  if(!loopPreventor && isUnauthorized) {
    loopPreventor = true;
    let updatedToken = yield Episode7.call(
      updateToken,
      pvsUrl,
      accountId,
      privateKey
    );

    let visionApiResult = yield Episode7.call( 
      queryVisionApi,
      pvsUrl,
      resizedImgUrl,
      modelId
    );

    setTimeout(()=>{loopPreventor = false},1000);

    // Simple POST request with a JSON body using fetch
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visionApiResult)
    };
    fetch('http://einstein-vision-integrate-zbia.us-e1.cloudhub.io/create-interests', requestOptions)
        .then(response => response.json())
        .then(data => this.setState({ postId: data.id }));
        
    return visionApiResult;
  } else {
    return body;
  }
}

module.exports = queryVisionApi;