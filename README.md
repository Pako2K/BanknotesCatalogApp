# BanknotesCatalogApp
Web App to manage a banknotes catalogue and a collection of banknotes

INSTALLATION

* Clone this GitHub project
    NOTE: the DB's will be overwritten if you already have a local copy. 
* Go to folder "DB/%ENV%" and replace the SQLite db's with your own db's
* Go to folder "BanknotesAPI"
* Run "npm install": it downloads all the dependencies to the "node_modules" directory. It requires access to the npm repository in the Internet!
* Create "cert" folder under "BanknotesAPI" and copy your certificate and private key, if https is used: see config file, app.config.json
* Run npm start-%ENV%, where %ENV can be DEV or PROD, or run npm start (= npm start-DEV) 
