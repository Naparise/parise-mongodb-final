# MongoDB & WebApps Final Project

My final project for Database Systems and Big Data Processing (COMP SCI 451) at the University of Wisconsin–Green Bay.

## Project Structure

* `node/` - node packages and server entry point (webapp.js)
* `node/public/` - website resources; html/ejs documents, css, images, etc


## Installing Node Dependencies

To install the required packages, enter the node directory and run the installation command.
```bash
cd node
npm install
```

## Additional Dependencies

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