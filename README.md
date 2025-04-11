
# MongoDB & WebApps Final Project

Code can also be found on [GitHub](https://github.com/Naparise/parise-mongodb-final)

My final project for Database Systems and Big Data Processing (COMP SCI 451) at the University of Wisconsin–Green Bay.

## Project Structure

* `node/` - node packages and server entry point (webapp.js)
* `node/public/` - website resources; html/ejs documents, css, images, etc

## Required Software

* [node.js](https://nodejs.org/) - web server backend
* [mongodb](https://www.mongodb.com/) - database services
	* Containerized installation of MongoDB is covered in [Database Setup](#database-setup)

## Installing Node Dependencies

To install the required packages, enter the node directory and run the installation command.
```bash
cd node
npm install
```

## Database Setup

A MongoDB server connection is needed for this application to run.
MongoDB can be conveniently installed and run within a Docker container.

Follow [this tutorial](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-community-with-docker/) for pulling the latest MongoDB image and creating a container.
If connection issues arise, you can try creating a container with the command below to support IPv6. Appending `--bind_ip_all` may also resolve issues, though [this may introduce risks on unsecured systems](https://www.mongodb.com/docs/v4.4/core/security-mongodb-configuration/).

```bash
docker container create --name mongodb -p 27017:27017 mongodb/mongodb-community-server:latest --ipv6
```

The MongoDB server can now be started through its container.
```bash 
docker start mongodb
```

## Running

The web server can be started by running `webapp.js` within the node directory.
```bash
node webapp.js
```

This script contains a hard-coded and publicly accessible session secret for cookie tracking. This would be a major security vulnerability if it was used in a real, public-facing application. In this application, the secret can be customized by setting `COOKIE_SECRET` as an environment variable on the host system, which will be used in place of the default value.