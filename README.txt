Code can also be found at https://github.com/Naparise/parise-mongodb-final

My final project for Database Systems and Big Data Processing (COMP SCI 451) at the University of Wisconsin–Green Bay.

Required Software:
node.js (https://nodejs.org/)
mongodb (https://www.mongodb.com/)

Instructions:
To install the required packages, enter the node directory and run "npm install"

A MongoDB server connection is needed for this application to run. Follow https://www.mongodb.com/docs/manual/tutorial/install-mongodb-community-with-docker for pulling the latest MongoDB image and creating a container.

If connection issues arise, you can instead try creating a container with "docker container create --name mongodb -p 27017:27017 mongodb/mongodb-community-server:latest --ipv6 --bind_ip_all"
(Note that --bind_ip_all may introduce security vulnerabilities on unsecured systems)