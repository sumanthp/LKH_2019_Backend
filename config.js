const dotenv = require('dotenv');
const result = dotenv.config({path:'config.env'});
if (result.error) {
    throw result.error;
  }
  const { parsed: envs } = result;
//   console.log(envs);
  module.exports = {
    port: process.env.PORT,
    connectionstring: process.env.API_URL
}
  //module.exports = envs;