//  Packages
var core = require('@actions/core')
var execSync = require('child_process').execSync
code = execSync('npm install exeq --save')
var exeq = require('exeq')
const { promises: fs } = require('fs')


//  Input variables
var CANARY_DEPLOYMENTS = core.getInput('canary-deployments')
var DOMAIN_MANAGER = core.getInput('domain-manager')

//  Installs Serverless and specified plugins
async function installServerlessAndPlugins() {
  await exeq(
    `echo Installing Serverless and plugins...`,
    `npm i serverless@3.21.0  -g`,
    `npm i serverless-plugin-canary-deployments`,
    `npm i serverless-python-requirements@5.4.0`
  )
}

//  Runs Serverless deploy using AWS Credentials if specified, else SERVERLESS ACCESS KEY
async function runServerlessDeploy() {
  // 
  const path = 'services-hashing.json'

  /*
    {
      "update_all" : false,
      "services" : [
        "place",
        "manage_cart"
      ]
    }
  */
  try {
    let content = await fs.readFile(path, 'utf8')
//     let content = fs.readFileSync(path, 'utf8')
    var config = JSON.parse(content);

    if (config.update_all == true) {
      await exeq(
        `echo Running sls deploy...`,
        `if [ ${process.env.AWS_ACCESS_KEY_ID} ] && [ ${process.env.AWS_SECRET_ACCESS_KEY} ]; then
          sls config credentials --provider aws --key ${process.env.AWS_ACCESS_KEY_ID} --secret ${process.env.AWS_SECRET_ACCESS_KEY} --verbose
        fi`,
        `sls deploy --verbose`
      )
    } else {
      await exeq(`sls package`)
      config.services.forEach(async (service) => {
        await exeq(
          `echo Running sls deploy...`,
          `if [ ${process.env.AWS_ACCESS_KEY_ID} ] && [ ${process.env.AWS_SECRET_ACCESS_KEY} ]; then
            sls config credentials --provider aws --key ${process.env.AWS_ACCESS_KEY_ID} --secret ${process.env.AWS_SECRET_ACCESS_KEY} --verbose
          fi`,
          `sls deploy function -f ${service} --verbose`
        )
      });
    }

  } catch (err) {
    console.log("Kareem Error " , err );
    await exeq(
      `echo Running sls deploy...`,
      `if [ ${process.env.AWS_ACCESS_KEY_ID} ] && [ ${process.env.AWS_SECRET_ACCESS_KEY} ]; then
        sls config credentials --provider aws --key ${process.env.AWS_ACCESS_KEY_ID} --secret ${process.env.AWS_SECRET_ACCESS_KEY} --verbose
      fi`,
      `sls deploy --verbose`
    )
    
    console.log("Kareem Error " , err );

  }


}

//  Runs all functions sequentially
async function handler() {
  try {
    await installServerlessAndPlugins()
    await runServerlessDeploy()
  } catch (error) {
    core.setFailed(error.message);
  }
}

//  Main function
if (require.main === module) {
  handler()
}
