# BanknotesCatalogApp
Web App to manage a banknotes catalogue and a collection of banknotes


***************************************************************************************************************************************************
INSTALLATION (DEV-like), App and DB running on local servers
-------------------------------------------------------------------
* Clone this GitHub project
* Run "npm install": it downloads all the dependencies to the "node_modules" directory. It requires access to the npm repository in the Internet!
* App configuration:
    - Port: the application will use the value defined in the env variable PORT. If that variable is not available then it will use the value defined in "serverPort", in DEV/app.config.json
    - SSL: configured in "useHTTPS". By default it is false. If set to true, make sure to provide the right location of the certificates and the other parameters for SSL, for instance:   

        "sslOptions": {
            "maxVersion": "TLSv1.3",
            "minVersion": "TLSv1.2",
            "requestCert": false,
            "privateKeyFile": "./cert/privateKey.key",
            "certificateFile": "./cert/certificate.crt",
            "handshakeTimeout": 60000
        }

    - Session Management: configured like this by default:

        "sessionOptions": {
            "name": "wid",
            "cookie": {
                "path": "/",
                "httpOnly": true,
                "secure": false,
                "maxAge": 1200000
            },
            "resave": true,
            "unset": "destroy",
            "saveUninitialized": false,
            "rolling": true
        }

        In case HTTPS communication is used, the option "secure" should be set to "true"

        IMPORTANT!:
        For this default DEV configuration (using HTTP): session managment only works with EDGE. Probably Chrome prevents that the Session Id Cookie is sent back via HTTP.

* DB Creation and Configuration: create 2 DB's in PostgreSQL (e.g "banknotes" and "credentials").
    Download DB structure and data from: https://github.com/Pako2K/BanknotesCatalogDB
    Execute the sql scripts and import the data in the corresponding tables
    Change the password for the app user, AppAPI
    Note down the URL of each DB:
        postgres://AppAPI:<pwd>@<dbhost>:<dbport>/<dbName>
    
    These values can be configured in the config file, DEV/app.config.json, but this is not recommendable: 

        "credentialsDB": {
            "connectionString": <CRE_DB_URL | null>,
            "ssl": false
        },
        "catalogueDB": {
            "connectionString": <CAT_DB_URL | null>,
            "ssl": false
        },
    
    It is recommended to use "connectionString: null" so the DB's URL will be read from these 2 env variables: CRE_DATABASE_URL and CAT_DATABASE_URL. 
    For a local DB in the DEV env, it is assumed that a SSL connection is not needed (ssl = false).


Running / Testing the App
---------------------------
From the Command Line (Windows): 
    set CRE_DATABASE_URL=postgres://AppAPI:<pwd>@<dbhost>:<dbport>/<credentialsDbName>
    set CAT_DATABASE_URL=postgres://AppAPI:<pwd>@<dbhost>:<dbport>/<banknotesDbName>
    set PORT = 80 (or any othe port you want)
    set MAIL_PWD = <mail_provider_password>
    node main.js DEV 
    (or npm start-DEV)

From Visual Studio Code:
    - Configuration example (launch.json):
        {
            "env": {
                "PORT": "80",
                "CRE_DATABASE_URL": "postgres://AppAPI:AppAPI@localhost:5432/credentials",
                "CAT_DATABASE_URL": "postgres://AppAPI:AppAPI@localhost:5432/banknotes",
                 "MAIL_PWD": "mailpwd"
            },
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "program": "${workspaceFolder}\\main.js",
            "args": ["DEV"]
        }

Logs will be created in the stdout and a file "logs/banknotes-api.log", which is rotated daily. See config/DEV/log4js.config.json
NOTE: in DEBUG mode, VSC will not show the stdout logs!
***************************************************************************************************************************************************



***************************************************************************************************************************************************
INSTALLATION (PROD-like), App and DB running on local servers
-------------------------------------------------------------------
* Clone this GitHub project
* Run "npm install": it downloads all the dependencies to the "node_modules" directory. It requires access to the npm repository in the Internet!
* App configuration:
    - Port: the application will use the value defined in the env variable PORT. If that variable is not available then it will use the value defined in "serverPort", in DEV/app.config.json
    - SSL: configured in "useHTTPS". By default it is true. Make sure to provide the right location of the certificates and the other parameters for SSL, for instance:   

        "sslOptions": {
            "maxVersion": "TLSv1.3",
            "minVersion": "TLSv1.2",
            "requestCert": false,
            "privateKeyFile": "./cert/privateKey.key",
            "certificateFile": "./cert/certificate.crt",
            "handshakeTimeout": 60000
        }

    - Session Management: configured like this by default:

        "sessionOptions": {
            "name": "wid",
            "cookie": {
                "path": "/",
                "httpOnly": true,
                "secure": true,
                "maxAge": 1200000
            },
            "resave": true,
            "unset": "destroy",
            "saveUninitialized": false,
            "rolling": true
        }

* DB Creation and Configuration: create 2 DB's in PostgreSQL (e.g "banknotes" and "credentials").
    Download DB structure and data from: https://github.com/Pako2K/BanknotesCatalogDB
    Execute the sql scripts and import the data in the corresponding tables
    Change the password for the app user, AppAPI
    Note down the URL of each DB:
        postgres://AppAPI:<pwd>@<dbhost>:<dbport>/<dbName>
    
    These values can be configured in the config file, PROD/app.config.json, but this is not recommendable: 

        "credentialsDB": {
            "connectionString": <CRE_DB_URL | null>,
            "ssl": {
                "rejectUnauthorized": false
            }
        },
        "catalogueDB": {
            "connectionString": <CAT_DB_URL | null>,
            "ssl": {
                "rejectUnauthorized": false
            }
        },
    
    Instead it is recommended to use "connectionString: null" so the DB's URL will be read from these 2 env variables: CRE_DATABASE_URL and CAT_DATABASE_URL. 
    It is assumed that a SSL connection will be used. "rejectUnauthorized" is set to false since no mutual authentication is used:  no client certificates are needed 


Running the App
----------------
From the Command Line (Windows): 
    set CRE_DATABASE_URL=postgres://AppAPI:<pwd>@<dbhost>:<dbport>/<credentialsDbName>
    set CAT_DATABASE_URL=postgres://AppAPI:<pwd>@<dbhost>:<dbport>/<banknotesDbName>
    set PORT = 443 (or any other port you want)
    set MAIL_PWD = <mail_provider_password>
    node main.js PROD 
    (or "npm start-PROD", or "npm start")

Logs (only INFO or ERROR) will be created in a file "logs/banknotes-api.log", which is rotated daily. See config/PROD/log4js.config.json
***************************************************************************************************************************************************



***************************************************************************************************************************************************
INSTALLATION (CLOUD - HEROKU)
-------------------------------------------------------------------
* Create an application in Heroku, e.g. banknotes-catalog
* Clone/fork this GitHub project
* App configuration:
    - Port: the application will use the value defined in the env variable PORT (set by Heroku).
    - SSL: configured in "useHTTPS". By default it is false. Heroku will expose a endpoint via SSL and rout the request to the app via HTTP
    - Session Management: configured like this by default:

        "sessionOptions": {
            "name": "wid",
            "cookie": {
                "path": "/",
                "httpOnly": true,
                "secure": false,
                "maxAge": 1200000
            },
            "resave": true,
            "unset": "destroy",
            "saveUninitialized": false,
            "rolling": true
        }

* DB Creation and Configuration: create 2 DB's in PostgreSQL (e.g "banknotes" and "credentials").

    Create 2 DB Postgres addons in your Heroku application, by executing twice:
        "heroku addons:create heroku-postgresql:<plan> -a <app-name>"
    Note down the URL of each DB. 
        ==> content of the environment variables: DATABASE_URL, HEROKU_POSTGRESQL_<colour>_URL (e.g. postgres://<user>:<pwd>@<server>:<port>/<dbName>)

    Create 2 additional env variables, CAT_DATABASE_URL and CRE_DATABASE_URL,  and asssign the same values as the ones set in DATABASE_URL and HEROKU_POSTGRESQL_<colour>_URL
    Create another env variable for the mail password: MAIL_PWD = <mail_provider_password>

    Create DB structures and load data:

    - Option 1: 
            Download DB structure and data from: https://github.com/Pako2K/BanknotesCatalogDB
            Execute the sql scripts and import the data in the corresponding tables: using pgAdmin, on the remmote Heroku servers.
            Change the password for the app user, AppAPI
    - Option 2:
            Clone your local DB's into the Heroku PostgreSQL DB's (the user name and password to connect to the local DB are read from env variables: PGUSER and PGPASSWORD):
                
                heroku pg:push <locald_db_name> HEROKU_POSTGRESQL_<colour> --app <heroku_app>

            Note: It is also possible to download the HerokuDB to your local DB:
        
                heroku pg:pull HEROKU_POSTGRESQL_<colour> <local_db_name> --app <heroku_app>



DEPLOY AND RUN THE APP
-----------------------
In the Procfile select the default run command is: 
    
    web: node main.js PROD:

From the root directory of your GIT project execute: 

    git push heroku master
