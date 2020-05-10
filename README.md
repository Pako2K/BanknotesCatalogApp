# BanknotesCatalogApp
Web App to manage a banknotes catalogue and a collection of banknotes

INSTALLATION

* Clone this GitHub project
* Run "npm install": it downloads all the dependencies to the "node_modules" directory. It requires access to the npm repository in the Internet!

* DB Configuration: update ...

* Create "cert" folder and copy your certificate and private key, if https is used: see config file, app.config.json



NOTES:

* DEV configuration: sessions only work with EDGE. Probably Chorme prevents that the Session Id Cookie is sent back via HTTP.


RUN MODES:

- Configuration:
    - Environment variables: PORT, CRE_DATABASE_URL, CAT_DATABASE_URL (if they are not found the values will be read from the config files)
    - Config files: app.config.json & log4js.config.json

- Local Setup:
    * In VSC: Configure the env variables and args in the launch.json file. For instance:
        "env": {
                    "PORT": aPortNumber
                    "CRE_DATABASE_URL": DBconnectString,
                    "CAT_DATABASE_URL": DBconnectString,
                },
         "args": ["DEV" or "PROD"]
    * In Command Line: set the env variables and run "npm run start-%ENV%", where %ENV can be DEV or PROD, or run "npm start" (= "npm run start-PROD")
        ** DEV: use DEV/*.config.json files. For instance run nodejs app locally and connect to local DB
        ** PROD: use PROD/*.config.json files. For instance run nodejs app locally and connect to remote DB (e.g. this will be used when deploying the app in Heroku)
    * Heroku: make sure that the env variables are set. In the Procfile select the run command: 
        web: node main.js PROD
