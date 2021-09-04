
async function decodeTokenURI(uri){
  const newJson = Buffer.from(uri.substring(29), "base64").toString();
  return JSON.parse(newJson);
}

module.exports = {
  decodeTokenURI
}
