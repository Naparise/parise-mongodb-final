
# MongoDB & WebApps Final Project

Code can also be found on [GitHub](https://github.com/Naparise/parise-mongodb-final)

My final project for Database Systems and Big Data Processing (COMP SCI 451) at the University of Wisconsin–Green Bay.

## Project Structure

* `node/` - node packages and server entry point (webapp.js)
* `node/public/` - website resources; html/ejs documents, css, images, etc

## Required Software

* [node.js](https://nodejs.org/) - web server backend
* [mongodb](https://www.mongodb.com/) - database services
	* Replication set config and MongoDB server hosting is covered in [Database Setup](#database-setup)

## Installing Node Dependencies

To install the required node packages, enter the node directory and run the installation command.
```bash
cd node
npm install
```

## Database Setup

This application requires multiple MongoDB servers grouped as a replication set to execute transaction-based database queries. The following content covers the configuration of this replication set for a standard MongoDB installation (i.e. not through Docker).

Upon installing MongoDB, find its configuration file. It should be located at `/bin/mongod.cfg` within the MongoDB installation on Windows, or `/etc/mongod.conf` on Linux. Within this file, find `#replication` and replace it with the content below. Note "rs0" may be replaced with any name you'd like to give the replication set.
```
replication:
  replSetName: "rs0"
```

Multiple MongoDB servers must now be created to be added to the replication set. The `mongod` command will be used to create each server. When creating these servers, you must specify a unique port for the server to use with `--port`, as well as a unique path for the server's data with `--dbpath`. An example, creating three MongoDB servers on a Unix filesystem, is provided below.
```bash
mongod --port 27017 --replSet rs0 --dbpath "/home/mongoUser/dbs/db1"
mongod --port 27018 --replSet rs0 --dbpath "/home/mongoUser/dbs/db2"
mongod --port 27019 --replSet rs0 --dbpath "/home/mongoUser/dbs/db3"
```

To connect these servers into a replication set, the mongo client shell can be used. Enter the shell by opening a new terminal window and typing either `mongo` on Windows or `mongosh` on Linux. Assuming the replication set is named `rs0` and three MongoDB servers are running on ports `27017`, `27018`, and `27019` respectively, the following commands will link these servers into the set.
```javascript
rs.initiate();
rs.add({host:"127.0.0.1:27017",priority:0,votes:0});
rs.add({host:"127.0.0.1:27018",priority:0,votes:0});
rs.add({host:"127.0.0.1:27019",priority:0,votes:0});
```

You can now validate that the set contains the provided servers.
```javascript
rs.status();
```

With the servers added to the replication set, all the required database functionality should be available.

## Running

The web server can be started by running `webapp.js` within the node directory.
```bash
node webapp.js
```

Running with its default settings, the home page can be accessed at `localhost:3000` from your web browser.

This script contains a hard-coded and publicly accessible session secret for cookie tracking. This would be a major security vulnerability in a real, public-facing application, which this project is not intended to be. In the case that a more secure secret is preferred, it can be customized by setting the `COOKIE_SECRET` environment variable on the host system.

## Product Ratings
User ratings are provided on a 1 - 5 half-star scale, for each item per order.

Per-item rating averages displayed on the catalog page are rounded up or down at the quarter marks.

Examples:

3.24 rounds down to 3 stars, 3.25 rounds up to 3.5.

3.74 rounds down to 3.5 stars, 3.75 rounds up to 4.