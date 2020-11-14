const rp = require('request-promise');
var Episode7 = require('episode-7');
const updateToken = require('./update-token');
const oAuthToken = require('./oauth-token');
const salesforceAPI = process.env.SALESFORCEAPI;

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

  
  var result = body;

  var options = {
      url: salesforceAPI,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body:result
  }

  const response = yield Episode7.call(rp.post, options);
  console.log(response);


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

    return visionApiResult;
  } else {
    return body;
  }
}

module.exports = queryVisionApi;